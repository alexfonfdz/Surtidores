# -*- encoding: utf-8 -*-
"""
Copyright (c) 2019 - present AppSeed.us
"""

import threading
import time
from django import template
from django.db import IntegrityError
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseRedirect
from django.template import loader
from django.urls import reverse
from calendar import month_name
from datetime import datetime, timedelta
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.core.paginator import Paginator
from calendar import month_name
from datetime import datetime
from django.views.decorators.csrf import csrf_exempt
from core.settings import ENV_PSQL_NAME, ENV_PSQL_USER, ENV_PSQL_PASSWORD, ENV_PSQL_HOST, ENV_PSQL_PORT, ENV_MYSQL_HOST, ENV_MYSQL_USER, ENV_MYSQL_PASSWORD, ENV_MYSQL_NAME, ENV_MYSQL_PORT, ENV_SCHEMA, ENV_YEAR, ENV_MONTH, ENV_DAY
import json
import psycopg2 as p
import mysql.connector as m
from django.contrib.auth.hashers import make_password


@login_required(login_url="/login/")
def index(request):
    context = {'segment': 'index'}

    html_template = loader.get_template('home/index.html')
    return HttpResponse(html_template.render(context, request))

@login_required(login_url="/login/")
def pages(request):

    context = {}
    # All resource paths end in .html.
    # Pick out the html file name from the url. And load that template.
    try:

        load_template = request.path.split('/')[-1]

        if load_template == 'admin':
            return HttpResponseRedirect(reverse('admin:index'))
        context['segment'] = load_template

        html_template = loader.get_template('home/' + load_template)
        return HttpResponse(html_template.render(context, request))

    except template.TemplateDoesNotExist:

        html_template = loader.get_template('home/page-404.html')
        return HttpResponse(html_template.render(context, request))

    except:
        html_template = loader.get_template('home/page-500.html')
        return HttpResponse(html_template.render(context, request))

@csrf_exempt
def get_empleados(request):
    try:
        # Parámetros de paginación
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        offset = (page - 1) * page_size

        # Parámetros de filtro
        search = request.GET.get('search', '').strip()
        clave_empleado = request.GET.get('clave_empleado', '').strip()
        codigo_rol = request.GET.get('codigo_rol', '').strip()
        rol = request.GET.get('rol', '').strip()
        activo = request.GET.get('activo', '').strip()

        # Conexión a la base de datos
        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()

        # Construir la consulta SQL con filtros
        query = """
            SELECT 
                e.id,
                e.nombre,
                e.apellido_paterno,
                e.apellido_materno,
                e.clave_empleado,                
                r.nombre AS rol,
                e.codigo_rol,
                e.activo
            FROM home_empleado e
            LEFT JOIN roles r
                ON e.rol_id = r.id
            WHERE (%s = '' OR CONCAT(e.nombre, ' ', e.apellido_paterno, ' ', e.apellido_materno) LIKE %s)
              AND (%s = '' OR e.clave_empleado LIKE %s)
              AND (%s = '' OR e.codigo_rol LIKE %s)
              AND (%s = '' OR e.rol_id = %s)
              AND (%s = '' OR e.activo = %s)
            ORDER BY e.activo DESC, e.nombre ASC
            LIMIT %s OFFSET %s;
        """
        params = [
            search, f"%{search}%",
            clave_empleado, f"%{clave_empleado}%",
            codigo_rol, f"%{codigo_rol}%",
            rol, rol,
            activo, activo,
            page_size, offset
        ]

        cur.execute(query, params)
        empleados = cur.fetchall()

        # Obtener nombres de columnas
        column_names = [column[0] for column in cur.description]

        # Obtener el total de registros (sin paginación)
        cur_count = conn.cursor()
        count_query = """
            SELECT COUNT(*)
            FROM home_empleado e
            LEFT JOIN roles r
                ON e.rol_id = r.id
            WHERE (%s = '' OR CONCAT(e.nombre, ' ', e.apellido_paterno, ' ', e.apellido_materno) LIKE %s)
              AND (%s = '' OR e.clave_empleado LIKE %s)
              AND (%s = '' OR e.codigo_rol LIKE %s)
              AND (%s = '' OR e.rol_id = %s)
              AND (%s = '' OR e.activo = %s);
        """
        cur_count.execute(count_query, params[:-2])  # Excluir `LIMIT` y `OFFSET`
        total_records = cur_count.fetchone()[0]
        cur_count.close()

        # Convertir resultados a lista de diccionarios y manejar caracteres no ASCII
        empleados_list = [
            dict(zip(
                column_names,
                [
                    value.encode('utf-8').decode('utf-8', errors='replace') if isinstance(value, str) else value
                    for value in row
                ]
            ))
            for row in empleados
        ]

        # Calcular el número total de páginas
        total_pages = (total_records + page_size - 1) // page_size

        # Cerrar conexión
        cur.close()
        conn.close()

        # Devolver resultados en formato JSON
        return JsonResponse({
            'results': empleados_list,
            'current_page': page,
            'num_pages': total_pages,
            'has_previous': page > 1,
            'has_next': page < total_pages,
        }, safe=False)

    except m.Error as e:
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)


@csrf_exempt
def get_empleado(request):
    id_empleado = request.GET.get('id_empleado', '')

    if not id_empleado:
        return JsonResponse({'error': 'El ID del empleado es obligatorio.'}, status=400)

    conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                e.id,
                e.empleado_imagen,
                e.nombre,
                e.apellido_paterno,
                e.apellido_materno,
                e.clave_empleado,
                e.curp,
                e.rfc,
                e.email,
                e.celular,
                r.id,
                r.nombre AS rol,
                e.codigo_rol,
                e.fecha_nacimiento,		
                e.activo
            FROM home_empleado e
            LEFT JOIN roles r
                ON e.rol_id = r.id
            WHERE e.id = %s
            LIMIT 1;
        """, (id_empleado,))
        empleado = cur.fetchone()

        if not empleado:
            return JsonResponse({'error': 'Empleado no encontrado.'}, status=404)

        # Convertir el resultado en un diccionario y manejar caracteres no ASCII
        empleado_dict = {
            'id': empleado[0],
            'empleado_imagen': empleado[1],
            'nombre': empleado[2].encode('utf-8').decode('utf-8', errors='replace') if isinstance(empleado[2], str) else empleado[2],
            'apellido_paterno': empleado[3].encode('utf-8').decode('utf-8', errors='replace') if isinstance(empleado[3], str) else empleado[3],
            'apellido_materno': empleado[4].encode('utf-8').decode('utf-8', errors='replace') if isinstance(empleado[4], str) else empleado[4],
            'clave_empleado': empleado[5],
            'curp': empleado[6],
            'rfc': empleado[7],
            'email': empleado[8],
            'celular': empleado[9],
            'rol_id': empleado[10],
            'rol': empleado[11].encode('utf-8').decode('utf-8', errors='replace') if isinstance(empleado[11], str) else empleado[11],
            'codigo_rol': empleado[12],
            'fecha_nacimiento': empleado[13],
            'activo': empleado[14],
        }

        return JsonResponse(empleado_dict, safe=False)
    except m.Error as e:
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    finally:
        cur.close()
        conn.close()


@csrf_exempt
@login_required
def update_empleados(request):
    try:
        user_id = request.user.id

        conn = p.connect(dbname=ENV_PSQL_NAME, user=ENV_PSQL_USER, host=ENV_PSQL_HOST, password=ENV_PSQL_PASSWORD, port=ENV_PSQL_PORT)
        cur = conn.cursor()
        cur.execute(f"""
            SELECT
                id,
                nombre, 
                apellido_paterno, 
                apellido_materno, 
                CASE 
                    WHEN sexo = 1 THEN 'Hombre' 
                    WHEN sexo = 2 THEN 'Mujer' 
                    ELSE 'Indefinido' 
                END AS genero, 
                rfc, 
                curp,
                clave,
                esta_activo, 
                fecha_nacimiento, 
                email_adicional,
                celular,
                foto_empleado 
            FROM {ENV_SCHEMA}.admintotal_empleado;
        """)
        empleados = cur.fetchall()
        cur.close()
        conn.close()

        conn_m = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur_m = conn_m.cursor()
        cur_m.execute("SELECT clave_empleado, fecha_registro FROM home_empleado;")
        empleados_m = cur_m.fetchall()

        arr_clave_empleado_fecha = {empleado[0]: empleado[1] for empleado in empleados_m}

        for empleado in empleados:
            clave_empleado = empleado[7]
            if clave_empleado in arr_clave_empleado_fecha and arr_clave_empleado_fecha[clave_empleado] is None:
                cur_m.execute("""
                    UPDATE home_empleado SET
                        nombre = %s, apellido_paterno = %s, apellido_materno = %s, sexo = %s, rfc = %s, curp = %s, activo = %s, fecha_nacimiento = %s, email = %s, celular = %s, empleado_imagen = %s, fecha_registro = NOW(), usuario_registro_id = %s
                    WHERE clave_empleado = %s;
                """, (
                    empleado[1], empleado[2], empleado[3], empleado[4], empleado[5], empleado[6], empleado[8], empleado[9], empleado[10], empleado[11], empleado[12], user_id, clave_empleado
                ))
            else:
                cur_m.execute("""
                    UPDATE home_empleado SET
                        nombre = %s, apellido_paterno = %s, apellido_materno = %s, sexo = %s, rfc = %s, curp = %s, activo = %s, fecha_nacimiento = %s, email = %s, celular = %s, empleado_imagen = %s, fecha_modificacion = NOW(), usuario_modificacion_id = %s
                    WHERE clave_empleado = %s;
                """, (
                    empleado[1], empleado[2], empleado[3], empleado[4], empleado[5], empleado[6], empleado[8], empleado[9], empleado[10], empleado[11], empleado[12], user_id, clave_empleado
                ))

        conn_m.commit()

        cur_m.execute("SELECT * FROM home_empleado;")
        empleados_m2 = cur_m.fetchall()

        # Convertir resultados a lista de diccionarios y manejar caracteres no ASCII
        empleados_m2 = [
            {
                column[0]: value.encode('utf-8').decode('utf-8', errors='replace') if isinstance(value, str) else value
                for column, value in zip(cur_m.description, row)
            }
            for row in empleados_m2
        ]
        cur_m.close()
        conn_m.close()

        return JsonResponse(empleados_m2, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def update_empleado(request):    
    data = json.loads(request.body)
    clave_empleado = data.get('clave_empleado')
    rol_id = data.get('rol_id')
    codigo_rol = data.get('codigo_rol')

    # Validaciones
    if not clave_empleado:
        return JsonResponse({'status': 'error', 'message': 'La clave del empleado es obligatoria.'}, status=400)

    # Validar que el código de rol no sea mayor a 10 caracteres
    if codigo_rol and len(codigo_rol) > 10:
        return JsonResponse({'status': 'error', 'message': 'El código de rol no puede tener más de 10 caracteres.'}, status=400)

    # Conexión a la base de datos
    conn_m = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
    cur_m = conn_m.cursor()

    try:
        # Validar que el empleado exista
        cur_m.execute("SELECT id, rol_id, codigo_rol FROM home_empleado WHERE clave_empleado = %s;", (clave_empleado,))
        empleado = cur_m.fetchone()
        if not empleado:
            return JsonResponse({'status': 'error', 'message': 'El empleado con la clave proporcionada no existe.'}, status=404)

        id_empleado, rol_id_actual, codigo_rol_actual = empleado

        # Validar si no se modificaron los campos
        if str(rol_id_actual) == str(rol_id) and str(codigo_rol_actual) == str(codigo_rol):
            return JsonResponse({'status': 'info', 'message': 'No se ha modificado ningún campo.'}, status=200)

        # Validar que no se pueda actualizar el rol sin asignar un código de empleado
        if rol_id and (not codigo_rol or codigo_rol in ["", "N/D"]):
            return JsonResponse({'status': 'error', 'message': 'No se puede asignar un rol sin un código.'}, status=400)

        # Validar que el rol_id no sea null, vacío o "N/D" si se intenta asignar un código de rol
        if not rol_id or rol_id in ["", "N/D"]:
            if codigo_rol and codigo_rol not in ["", "N/D"]:
                return JsonResponse({'status': 'error', 'message': 'No se puede asignar un Código de rol si el rol_id es null, vacío o "N/D".'}, status=400)

        # Validar que el código de rol no exista en otro empleado
        if codigo_rol and codigo_rol not in ["", "N/D"]:
            cur_m.execute("SELECT id FROM home_empleado WHERE codigo_rol = %s AND clave_empleado != %s;", (codigo_rol, clave_empleado))
            codigo_rol_existente = cur_m.fetchone()
            if codigo_rol_existente:
                return JsonResponse({'status': 'error', 'message': 'El código de rol ya existe.'}, status=400)

        # Determinar qué campos se actualizaron
        cambios = []
        if str(rol_id_actual) != str(rol_id):
            cambios.append("rol")
        if str(codigo_rol_actual) != str(codigo_rol):
            cambios.append("código de rol")

        # Actualizar el rol y el código del rol
        cur_m.execute("""
            UPDATE home_empleado
            SET rol_id = %s, codigo_rol = %s, fecha_modificacion = NOW()
            WHERE clave_empleado = %s;
        """, (rol_id, codigo_rol, clave_empleado))

        conn_m.commit()

        # Actualizar el código de surtidor/panel/repartidor en home_movimiento
        if rol_id == 2:
            cur_m.execute("""
                UPDATE home_movimiento
                SET codigo_surtidor = %s
                WHERE surtidor_id = %s;
            """, (codigo_rol, id_empleado))

            conn_m.commit()
        if rol_id == 3:
            cur_m.execute("""
                UPDATE home_movimiento
                SET codigo_panel = %s
                WHERE panel_id = %s;
            """, (codigo_rol, id_empleado))

            conn_m.commit()
        if rol_id == 4:
            cur_m.execute("""
                UPDATE home_movimiento
                SET codigo_repartidor = %s
                WHERE repartidor_id = %s;
            """, (codigo_rol, id_empleado))

            conn_m.commit()

        # Construir el mensaje de respuesta
        if len(cambios) == 1:
            mensaje = f"{cambios[0].capitalize()} actualizado correctamente."
        else:
            mensaje = "Rol y código de rol actualizados correctamente."

        return JsonResponse({'status': 'success', 'message': mensaje}, safe=False)

    except IntegrityError:
        return JsonResponse({'status': 'error', 'message': 'Error de integridad en la base de datos.'}, status=400)
    finally:
        cur_m.close()
        conn_m.close()


@csrf_exempt
def get_roles(request):
    try:
        # Conexión a la base de datos
        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()

        # Consulta para obtener los roles excluyendo el rol con id = 1
        cur.execute("SELECT id, nombre FROM roles WHERE id != 1;")
        roles = cur.fetchall()

        # Convertir los resultados en una lista de diccionarios y manejar caracteres no ASCII
        roles_list = [
            {
                'id': role[0],
                'nombre': role[1].encode('utf-8').decode('utf-8', errors='replace') if isinstance(role[1], str) else role[1]
            }
            for role in roles
        ]

        # Cerrar la conexión
        cur.close()
        conn.close()

        # Devolver los resultados en formato JSON
        return JsonResponse({'roles': roles_list}, safe=False)
    except m.Error as e:
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)


# APIs para las notas de venta
@csrf_exempt
def get_almacen(request):
    try:
        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT(almacen) FROM home_movimiento WHERE fecha_entrega IS NOT NULL ORDER BY almacen DESC;")
        almacenes = cur.fetchall()
        cur.close()
        conn.close()

        # Convertir resultados a lista y manejar caracteres no ASCII
        almacenes_list = [
            almacen[0].encode('utf-8').decode('utf-8', errors='replace') if isinstance(almacen[0], str) else almacen[0]
            for almacen in almacenes
        ]

        return JsonResponse(almacenes_list, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def get_vendedores(request):
    try:
        conn = m.connect(
            host=ENV_MYSQL_HOST,
            user=ENV_MYSQL_USER,
            password=ENV_MYSQL_PASSWORD,
            database=ENV_MYSQL_NAME,
            port=ENV_MYSQL_PORT
        )
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT(empleado_id) FROM home_movimiento WHERE fecha_entrega IS NOT NULL AND empleado_id IS NOT NULL ORDER BY empleado_id ASC;")
        vendedores = cur.fetchall()

        if vendedores:
            vendedores_ids = [vendedor[0] for vendedor in vendedores if vendedor[0] is not None]
            if vendedores_ids:
                query = f"SELECT id, nombre, apellido_paterno, apellido_materno FROM home_empleado WHERE id IN {tuple(vendedores_ids)} ORDER BY nombre ASC;"
                cur.execute(query)
                vendedores = cur.fetchall()
                # Convertir resultados a lista de diccionarios y manejar caracteres no ASCII
                vendedores = [
                    {
                        'id': v[0],
                        'nombre': v[1].encode('utf-8').decode('utf-8', errors='replace') if isinstance(v[1], str) else v[1],
                        'apellido_paterno': v[2].encode('utf-8').decode('utf-8', errors='replace') if isinstance(v[2], str) else v[2],
                        'apellido_materno': v[3].encode('utf-8').decode('utf-8', errors='replace') if isinstance(v[3], str) else v[3]
                    }
                    for v in vendedores
                ]
            else:
                vendedores = []
        else:
            vendedores = []

        cur.close()
        conn.close()

        return JsonResponse(vendedores, safe=False)
    except m.Error as e:
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)
    
@csrf_exempt
def get_moneda(request):
    try:
        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT(moneda) FROM home_movimiento WHERE fecha_entrega IS NOT NULL ORDER BY moneda ASC;")
        monedas = cur.fetchall()
        cur.close()
        conn.close()

        # Convertir resultados a lista y manejar caracteres no ASCII
        monedas_list = [
            moneda[0].encode('utf-8').decode('utf-8', errors='replace') if isinstance(moneda[0], str) else moneda[0]
            for moneda in monedas
        ]

        return JsonResponse(monedas_list, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def get_surtidor(request):
    try:
        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT(surtidor_inicio_id) FROM home_movimiento WHERE fecha_entrega IS NOT NULL AND surtidor_inicio_id IS NOT NULL ORDER BY surtidor_inicio_id ASC;")
        surtidores = cur.fetchall()

        if surtidores:
            surtidores_ids = [surtidor[0] for surtidor in surtidores if surtidor[0] is not None]
            if surtidores_ids:
                query = f"SELECT id, nombre, apellido_paterno, apellido_materno FROM home_empleado WHERE id IN {tuple(surtidores_ids)} ORDER BY nombre ASC;"
                cur.execute(query)
                surtidores = cur.fetchall()
                # Convertir resultados a lista de diccionarios y manejar caracteres no ASCII
                surtidores = [
                    {
                        'id': s[0],
                        'nombre': s[1].encode('utf-8').decode('utf-8', errors='replace') if isinstance(s[1], str) else s[1],
                        'apellido_paterno': s[2].encode('utf-8').decode('utf-8', errors='replace') if isinstance(s[2], str) else s[2],
                        'apellido_materno': s[3].encode('utf-8').decode('utf-8', errors='replace') if isinstance(s[3], str) else s[3]
                    }
                    for s in surtidores
                ]
            else:
                surtidores = []
        else:
            surtidores = []

        cur.close()
        conn.close()

        return JsonResponse(surtidores, safe=False)
    except m.Error as e:
        print(f"Error MySQL: {str(e)}")
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        print(f"Error general: {str(e)}")
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)

@csrf_exempt
def get_movimientos(request):
    try:
        search = request.GET.get('search', '').encode('utf-8').decode('utf-8', errors='replace')
        almacen = request.GET.get('almacen', '')
        vendedor = request.GET.get('vendedor_id', '')
        moneda = request.GET.get('moneda', '')
        estado = request.GET.get('estado', '')  # Todos, no cancelado(activas), cancelado, facturado, por facturar(No facturado y no cancelado), devolucion
        status = request.GET.get('status', '')  # Todos, pagado, no pagado
        condicion = request.GET.get('condicion', '')  # Todos, contado, credito (cualquier condicion menos contado o Contado)
        tipo_movimiento = request.GET.get('tipo_movimiento', '')  # Todos, remision o pedido
        surtidor_id = request.GET.get('surtidor_id', '')  # Todos, surtidor_id
        desde = request.GET.get('desde', '')
        hasta = request.GET.get('hasta', '')
        cod = request.GET.get('cod', '')  # Si se marca la casilla, mostrar todos los de cod true
        domicilio = request.GET.get('domicilio', '')  # Si se marca la casilla, mostrar todos los de solo_domicilio true
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        order_by = request.GET.get('order_by', 'm.fecha_movimiento')
        order_dir = request.GET.get('order_dir', 'desc')

        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()
        cur.execute("SELECT orden_id_admin FROM home_movimiento WHERE tipo_movimiento = 'Remisión' AND orden_id_admin IS NOT NULL;")
        order_ids = cur.fetchall()
        order_ids = [order_id[0] for order_id in order_ids]

        # Construir la consulta SQL con filtros
        if order_by == 'fecha_movimiento':
            order_by_clause = f"CASE WHEN fecha_movimiento IS NULL THEN 1 ELSE 0 END, fecha_movimiento {order_dir.upper()}, folio DESC"
        else:
            order_by_clause = f"{order_by} {order_dir.upper()}, folio DESC"

        query = """
            SELECT m.id, m.empleado_id, m.surtidor_inicio_id, m.panel_id, m.repartidor_id, m.fecha_movimiento, m.condicion, m.almacen, 
                    m.folio, m.serie, m.folio_adicional, m.cliente, m.sucursal, m.pagado, m.metodo_pago,
                    m.cantidad_pedida, m.importe_pedido, m.iva_pedido, m.descuento_pedido, m.total_pedido, 
                    m.costo_venta, m.utilidad, m.moneda, m.orden_id_admin, m.tipo_movimiento,
                    m.cancelado, m.facturado, m.devolucion, m.solo_domicilio, m.cod, m.codigo_surtidor, m.codigo_panel, m.codigo_repartidor,
                    m.fecha_surtiendo, m.fecha_entrega, m.fecha_inicio_repartidor, m.fecha_final_repartidor, m.cantidad_entregada,
                    m.importe_entregado, m.iva_entregado, m.descuento_entregado, m.total_entregado, m.status, m2.folio as folio_remision
                    FROM home_movimiento m
                    LEFT JOIN home_movimiento m2 ON m2.id_admin = m.orden_id_admin 
            WHERE (%s = '' OR m.folio LIKE %s OR m.cliente LIKE %s OR m.sucursal LIKE %s OR m.folio_adicional LIKE %s)
            AND (%s = '' OR m.almacen = %s)
            AND (%s = '' OR m.empleado_id = %s)
            AND (%s = '' OR m.moneda = %s)
            AND (%s = '' OR m.pagado = %s)
            AND (m.fecha_entrega IS NOT NULL)
        """
        params = [search, f'%{search}%', f'%{search}%', f'%{search}%', f'%{search}%', almacen, almacen, vendedor, vendedor, moneda, moneda,  status, status]

        if order_ids:
            # Generar marcadores de posición dinámicamente
            placeholders = ', '.join(['%s'] * len(order_ids))
            query += f" AND (m.id_admin NOT IN ({placeholders}) OR m.id_admin IS NULL)"
            params.extend(order_ids)  # Agregar los valores de order_ids a los parámetros

        if surtidor_id:
            query += " AND m.surtidor_inicio_id = %s"
            params.append(surtidor_id)

        if estado == 'activas':
            query += " AND m.cancelado = false"
        if estado == 'cancelado':
            query += " AND m.cancelado = true"
        elif estado == 'facturado':
            query += " AND m.facturado = true"
        elif estado == 'por_facturar':
            query += " AND m.facturado = false AND m.cancelado = false"
        elif estado == 'devolucion':
            query += " AND m.devolucion = true"

        if tipo_movimiento == 'remision':
            query += " AND m.tipo_movimiento = 'Remisión'"
        elif tipo_movimiento == 'pedido':
            query += " AND m.tipo_movimiento = 'Pedido'"

        if condicion == 'contado':
            query += " AND LOWER(m.condicion) = LOWER('Contado')"
        elif condicion == 'credito':
            query += " AND LOWER(m.condicion) != LOWER('Contado')"

        if desde:
            query += " AND m.fecha_movimiento >= %s"
            params.append(desde)
        if hasta:
            query += " AND m.fecha_movimiento <= %s"
            params.append(hasta)

        if cod == 'si':
            query += " AND m.cod = 1"
        if domicilio == 'si':
            query += " AND m.solo_domicilio = 1"

        query += f" ORDER BY {order_by_clause}"

        cur.execute(query, params)
        movimientos = cur.fetchall()

        # Convertir a lista de diccionarios
        movimientos_list = [dict(zip([column[0] for column in cur.description], row)) for row in movimientos]

        # Paginación
        paginator = Paginator(movimientos_list, page_size)
        movimientos_page = paginator.get_page(page)
        movimientos_list = list(movimientos_page)

        cur.close()
        conn.close()

        return JsonResponse({
            'total': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': movimientos_page.number,
            'page_size': page_size,
            'results': movimientos_list,
            'has_previous': movimientos_page.has_previous(),
            'has_next': movimientos_page.has_next()
        }, safe=False)
    except m.Error as e:
        print(f"Error: {str(e)}")
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        print(f"Error: {str(e)}")
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)

@csrf_exempt
def get_movimiento(request):
    movimiento_id = request.GET.get('movimiento_id', '')
    try:
        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()
        cur.execute("""SELECT m.empleado_id, m.surtidor_inicio_id, m.panel_id, m.repartidor_id, m.fecha_movimiento, m.condicion, m.almacen, 
                    m.folio, m.serie, m.folio_adicional, m.cliente, m.sucursal, m.pagado, m.metodo_pago,
                    m.cantidad_pedida, m.importe_pedido, m.iva_pedido, m.descuento_pedido, m.total_pedido, 
                    m.costo_venta, m.utilidad, m.moneda, m.orden_id_admin, m.tipo_movimiento,
                    m.cancelado, m.facturado, m.devolucion, m.solo_domicilio, m.cod, m.codigo_surtidor, m.codigo_panel, m.codigo_repartidor,
                    m.fecha_surtiendo, m.fecha_entrega, m.fecha_inicio_repartidor, m.fecha_final_repartidor, m.cantidad_entregada, m.surtidor_inicio_id,
                    m.importe_entregado, m.iva_entregado, m.descuento_entregado, m.total_entregado, m.status, m2.folio as folio_remision
                    FROM home_movimiento m
                    LEFT JOIN home_movimiento m2 ON m2.id_admin = m.orden_id_admin 
                    WHERE m.id = %s;""", (movimiento_id,))
        movimiento = cur.fetchone()
        column_names = [column[0] for column in cur.description]
        cur.close()
        conn.close()

        if not movimiento:
            return JsonResponse({'error': 'Pedido no encontrado'}, status=404)

        # Convertir la tupla en un diccionario
        movimiento_dict = dict(zip(column_names, [
            value if not isinstance(value, str) else value.encode("utf-8").decode("utf-8", errors="replace")
            for value in movimiento
        ]))
        empleado_id = movimiento_dict['empleado_id']
        surtidor_id = movimiento_dict['surtidor_inicio_id']
        panel_id = movimiento_dict['panel_id']
        repartidor_id = movimiento_dict['repartidor_id']

        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()
        empleado, surtidor, panel, repartidor = None, None, None, None

        if empleado_id:
            cur.execute("SELECT clave_empleado, nombre, apellido_paterno, apellido_materno FROM home_empleado WHERE id = %s;", (empleado_id,))
            empleado = cur.fetchone()
        if surtidor_id:
            cur.execute("SELECT id, clave_empleado, codigo_rol, nombre, apellido_paterno, apellido_materno FROM home_empleado WHERE id = %s;", (surtidor_id,))
            surtidor = cur.fetchone()
        if panel_id:
            cur.execute("SELECT id, clave_empleado, codigo_rol, nombre, apellido_paterno, apellido_materno FROM home_empleado WHERE id = %s;", (panel_id,))
            panel = cur.fetchone()
        if repartidor_id:
            cur.execute("SELECT id, clave_empleado, codigo_rol, nombre, apellido_paterno, apellido_materno FROM home_empleado WHERE id = %s;", (repartidor_id,))
            repartidor = cur.fetchone()
        cur.close()
        conn.close()

        # Convertir los resultados en diccionarios
        if empleado:
            empleado = dict(zip(['clave_empleado', 'nombre', 'apellido_paterno', 'apellido_materno'], empleado))
        if surtidor:
            surtidor = dict(zip(['id', 'clave_empleado', 'codigo_rol', 'nombre', 'apellido_paterno', 'apellido_materno'], surtidor))
        if panel:
            panel = dict(zip(['id', 'clave_empleado', 'codigo_rol', 'nombre', 'apellido_paterno', 'apellido_materno'], panel))
        if repartidor:
            repartidor = dict(zip(['id', 'clave_empleado', 'codigo_rol', 'nombre', 'apellido_paterno', 'apellido_materno'], repartidor))

        # Agregar los datos al movimiento 
        movimiento_dict['empleado'] = empleado
        movimiento_dict['surtidor'] = surtidor
        movimiento_dict['panel'] = panel
        movimiento_dict['repartidor'] = repartidor

        return JsonResponse(movimiento_dict, safe=False)

    except Exception as e:
        print(f"Error: {e}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def get_movimiento_detalle(request):
    try:
        movimiento_id = request.GET.get('movimiento_id', '')

        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()
        cur.execute("""SELECT id, codigo_producto, producto, unidad_medida, cantidad_pedida, factor_um, 
                    precio_unitario, importe_pedido, iva_pedido, descuento_pedido, total_pedido,
                    cantidad_entregada, importe_entregado, iva_entregado, total_entregado, observacion
                     FROM home_movimientodetalle WHERE movimiento_id = %s;""", (movimiento_id,))
        movimiento_detalle = cur.fetchall()
        cur.close()
        conn.close()

        movimiento_detalle = [
            dict(zip([column[0] for column in cur.description], [
                value.encode("utf-8").decode("utf-8") if isinstance(value, str) else value
                for value in row
            ]))
            for row in movimiento_detalle
        ]

        return JsonResponse(movimiento_detalle, safe=False)
    except Exception as e:
        print(f"Error2: {e}")
        return JsonResponse({'error': e}, status=500)

@csrf_exempt
def update_movimiento_detalle(request):
    try:
        # Verificar que el método sea POST
        if request.method != 'POST':
            return JsonResponse({'error': 'Método no permitido. Usa POST.'}, status=405)

        # Verificar que el cuerpo de la solicitud no esté vacío
        if not request.body:
            return JsonResponse({'error': 'El cuerpo de la solicitud está vacío.'}, status=400)

        # Intentar cargar el JSON del cuerpo de la solicitud
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'El cuerpo de la solicitud no es un JSON válido.'}, status=400)

        # Obtener los datos necesarios
        user_id = request.user.id
        surtidor_id = data.get('surtidor_id')
        movimiento_id = data.get('movimiento_id')
        detalles = data.get('detalle_venta')

        # Validar que los datos requeridos estén presentes
        if not detalles:
            return JsonResponse({'error': 'No se han proporcionado detalles de la venta.'}, status=400)

        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()

        cur.execute("SELECT codigo_rol FROM home_empleado WHERE id = %s;", (surtidor_id,))
        surtidor = cur.fetchone()

        if not surtidor:
            return JsonResponse({'error': 'El surtidor no existe.'}, status=404)

        # Procesar los detalles de la venta
        for detalle in detalles:
            if 'id' not in detalle or 'cantidad_entregada' not in detalle:
                return JsonResponse({'error': 'Los detalles de la venta deben contener el id y la cantidad entregada.'}, status=400)

            movimiento_detalle_id = detalle['id']
            cantidad_entregada = float(detalle['cantidad_entregada'])
            observaciones = detalle.get('observaciones', '')

            cur.execute("""
                SELECT cantidad_entregada, factor_um, precio_unitario, importe_pedido, iva_pedido, descuento_pedido, total_pedido, observacion
                FROM home_movimientodetalle 
                WHERE id = %s;
            """, (movimiento_detalle_id,))
            result = cur.fetchone()
            if not result:
                return JsonResponse({'error': f'No se encontró el detalle del pedido con id {movimiento_detalle_id}.'}, status=404)

            cantidad_entregada_anterior, factor_um, precio_unitario, importe_pedido, iva_pedido, descuento_pedido, total_pedido, observacion_anterior = result

            importe_entregado = cantidad_entregada * precio_unitario * factor_um
            if importe_entregado > 0:
                iva_entregado = importe_entregado * iva_pedido / importe_pedido
                descuento_entregado = importe_entregado * descuento_pedido / importe_pedido
            else:
                iva_entregado = 0
                descuento_entregado = 0
            total_entregado = importe_entregado + iva_entregado - descuento_entregado

            if cantidad_entregada_anterior == False or cantidad_entregada_anterior == None:
                cur.execute("""
                    UPDATE home_movimientodetalle
                    SET cantidad_entregada = %s, importe_entregado = %s, iva_entregado = %s, descuento_entregado = %s, total_entregado = %s, fecha_registro = NOW(),
                        usuario_registro_id = %s, observacion = %s
                    WHERE id = %s;
                """, (cantidad_entregada, importe_entregado, iva_entregado, descuento_entregado, total_entregado, user_id, observaciones, movimiento_detalle_id))
            elif cantidad_entregada_anterior != cantidad_entregada:
                cur.execute("""
                    UPDATE home_movimientodetalle
                    SET cantidad_entregada = %s, importe_entregado = %s, iva_entregado = %s, descuento_entregado = %s, total_entregado = %s, 
                        fecha_modificacion = NOW(), usuario_modificacion_id = %s, observacion = %s
                    WHERE id = %s;
                """, (cantidad_entregada, importe_entregado, iva_entregado, descuento_entregado, total_entregado, user_id, observaciones, movimiento_detalle_id))
            elif cantidad_entregada_anterior == cantidad_entregada and observaciones != observacion_anterior:
                cur.execute("""
                    UPDATE home_movimientodetalle
                    SET cantidad_entregada = %s, importe_entregado = %s, iva_entregado = %s, descuento_entregado = %s, total_entregado = %s, 
                        fecha_modificacion = NOW(), usuario_modificacion_id = %s, observacion = %s
                    WHERE id = %s;
                """, (cantidad_entregada, importe_entregado, iva_entregado, descuento_entregado, total_entregado, user_id, observaciones, movimiento_detalle_id))
            else:
                pass
        conn.commit()

        # Actualizar el estado de la venta
        cur.execute("SELECT SUM(cantidad_entregada), SUM(importe_entregado), SUM(iva_entregado), SUM(descuento_entregado), SUM(total_entregado) FROM home_movimientodetalle WHERE movimiento_id = %s;", (movimiento_id,))
        totales = cur.fetchone()
        cantidad_entregada_total, importe_entregado_total, iva_entregado_total, descuento_entregado_total, total_entregado_total = totales

        cur.execute("SELECT fecha_entrega FROM home_movimiento WHERE id = %s;", (movimiento_id,))
        fecha_entrega = cur.fetchone()
        if fecha_entrega[0] is None:
            cur.execute("""
                UPDATE home_movimiento
                SET surtidor_inicio_id = %s, cantidad_entregada = %s, importe_entregado = %s, iva_entregado = %s, descuento_entregado = %s, total_entregado = %s, fecha_entrega = NOW(), codigo_surtidor = (SELECT codigo_rol FROM home_empleado WHERE id = %s)
                WHERE id = %s;
            """, (surtidor_id, cantidad_entregada_total, importe_entregado_total, iva_entregado_total, descuento_entregado_total, total_entregado_total, surtidor_id, movimiento_id))
        else:
            cur.execute("""
                UPDATE home_movimiento
                SET surtidor_inicio_id = %s, cantidad_entregada = %s, importe_entregado = %s, iva_entregado = %s, descuento_entregado = %s, total_entregado = %s, codigo_surtidor = (SELECT codigo_rol FROM home_empleado WHERE id = %s)
                WHERE id = %s;
            """, (surtidor_id, cantidad_entregada_total, importe_entregado_total, iva_entregado_total, descuento_entregado_total, total_entregado_total, surtidor_id, movimiento_id))

        conn.commit()
        cur.close()
        conn.close()

        return JsonResponse({'message': 'Detalle de venta actualizado correctamente.'}, safe=False)
    except m.Error as e:
        print(f"MySQL error: {str(e)}")
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        print(f"Error general: {str(e)}")
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)


@csrf_exempt
def get_usuarios(request):
    # CONEXION A LA BASE DE DATOS
    conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME)
    cur = conn.cursor()

    # CONSULTA SQL PARA OBTENER USERNAME, ROL Y ESTADO
    query = """
        SELECT
            au.id,
            au.username,
            r.id,
            r.nombre AS rol,
            au.is_active
        FROM auth_user au
        INNER JOIN roles r
            ON au.rol_id = r.id;
    """

    # EJECUCION DE LA CONSULTA
    cur.execute(query)
    usuarios = cur.fetchall()

    # CONVERTIR A LISTA DE DICCIONARIOS
    usuarios_list = [dict(zip([column[0] for column in cur.description], row)) for row in usuarios]

    # CERRAR CONEXION Y RESPUESTA EN FORMATO JSON
    cur.close()
    conn.close()

    return JsonResponse({
        'results': usuarios_list
    }, safe=False)


@csrf_exempt
def get_usuario(request):
    try:
        data = json.loads(request.body)
        usuario_id = data.get('id')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Cuerpo de la solicitud no es válido.'}, status=400)

    if not usuario_id:
        return JsonResponse({'error': 'ID de usuario no proporcionado'}, status=400)

    conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME)
    cur = conn.cursor()

    query = """
        SELECT
                 id,
            username
        FROM auth_user
        WHERE id = %s
    """
    cur.execute(query, (usuario_id,))
    usuario = cur.fetchone()

    if usuario:
        usuario_dict = {
            'id': usuario[0],
            'username': usuario[1],
        }
        return JsonResponse(usuario_dict, safe=False)
    else:
        return JsonResponse({'error': 'Usuario no encontrado'}, status=404)
    

def validar_contraseña(password):
    try:
        validate_password(password)
    except ValidationError as e:
        raise ValidationError(e.messages)


@csrf_exempt
def update_usuario(request):    
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        data = json.loads(request.body)        
        usuario_id = data.get('id')
        username = data.get('username')
        password = data.get('password')

        # Validar que el ID sea un número válido
        if not usuario_id or not str(usuario_id).isdigit():
            return JsonResponse({'error': ['ID de usuario no válido']}, status=400)

        # Validar que el username no sea None o vacío
        if username is not None and not isinstance(username, str):
            return JsonResponse({'error': ['El username debe ser una cadena de texto']}, status=400)

        # Validar que la contraseña sea una cadena si está presente
        if password is not None and not isinstance(password, str):
            return JsonResponse({'error': ['La contraseña debe ser una cadena de texto']}, status=400)

        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME)
        cur = conn.cursor()

        # Construir la consulta SQL dinámicamente
        fields_to_update = []
        params = []

        if username:
            fields_to_update.append("username = %s")
            params.append(username)

        if password:
            try:
                validar_contraseña(password)
                password = make_password(password)  # Encriptar la contraseña
                fields_to_update.append("password = %s")
                params.append(password)
            except ValidationError as e:
                return JsonResponse({'error': e.messages}, status=400)

        if not fields_to_update:
            return JsonResponse({'error': ['No se proporcionaron campos para actualizar']}, status=400)

        # Agregar el ID del usuario al final de los parámetros
        params.append(usuario_id)

        # Construir la consulta final
        query = f"""
            UPDATE auth_user
            SET {', '.join(fields_to_update)}
            WHERE id = %s
        """
        cur.execute(query, params)

        conn.commit()
        cur.close()
        conn.close()

        return JsonResponse({'message': 'Usuario actualizado correctamente'}, status=200)
    except json.JSONDecodeError:
        return JsonResponse({'error': ['JSON inválido']}, status=400)
    except ValidationError as e:
        return JsonResponse({'error': e.messages}, status=400)
    except Exception as e:
        return JsonResponse({'error': [str(e)]}, status=500)

    
#Reporte surtidores:
@csrf_exempt
def get_reporte_surtidores(request):
    try:
        # Obtención de parámetros de la solicitud
        search = request.GET.get('search', '')  # Buscar por nombre, apellido, codigo_surtidor
        desde = request.GET.get('desde', '')
        hasta = request.GET.get('hasta', '')
        activo = request.GET.get('activo', '')  # Todos, activos, inactivos
        surtidor_sin_clave = request.GET.get('surtidor_sin_clave', '')  # Con clave, sin clave
        year = request.GET.get('year', '')
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        order_by = request.GET.get('order_by', 'nombre')
        order_dir = request.GET.get('order_dir', 'asc')

        # Conexión a la base de datos
        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()

        # Construir la cláusula de ordenación
        if order_by == 'e.codigo_surtidor':
            order_by_clause = f"CASE WHEN e.codigo_rol IS NULL OR e.codigo_rol = '' THEN 1 ELSE 0 END, e.codigo_rol {order_dir.upper()}"
        else:
            order_by_clause = f"{order_by} {order_dir.upper()}"

        # Lógica para manejar 'activo'
        if activo == '1':
            activo_clause = "AND e.activo = 1"
        elif activo == '0':
            activo_clause = "AND e.activo = 0"
        else:
            activo_clause = ""  # No se añade la condición de activo

        # Consulta SQL con LEFT JOIN para incluir surtidores sin ventas
        query = f"""
            SELECT e.id, e.nombre, e.apellido_paterno, e.apellido_materno, e.codigo_rol, 
                COALESCE(SUM(CASE WHEN md.cantidad_entregada IS NOT NULL THEN md.cantidad_entregada ELSE 0 END), 0) AS piezas,
                COALESCE(COUNT(DISTINCT m.fecha_entrega), 0) AS surtidos,
                e.activo, e.empleado_imagen
            FROM home_empleado e
            LEFT JOIN home_movimiento m ON m.surtidor_inicio_id = e.id
            LEFT JOIN home_movimientodetalle md ON m.id = md.movimiento_id
            WHERE (%s = '' OR e.nombre LIKE %s OR e.apellido_paterno LIKE %s OR e.apellido_materno LIKE %s OR e.codigo_rol LIKE %s)
            {activo_clause}
            AND (
                (%s = 'con_clave' AND e.codigo_rol IS NOT NULL)
                OR (%s = 'sin_clave' AND e.codigo_rol IS NULL AND md.id IS NOT NULL)
                OR (%s = '' AND (md.id IS NOT NULL OR e.codigo_rol IS NOT NULL))
            )
            AND e.rol_id = 2
        """

        params = [search, f'%{search}%', f'%{search}%', f'%{search}%', f'%{search}%', surtidor_sin_clave, surtidor_sin_clave, surtidor_sin_clave]

        # Agregar filtros de fecha si existen
        if desde:
            desde = datetime.strptime(desde, "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0)
            query += " AND m.fecha_entrega >= %s"
            params.append(desde)
        if hasta:
            hasta = datetime.strptime(hasta, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=0)
            query += " AND m.fecha_entrega <= %s"
            params.append(hasta)

        if year:
            query += " AND YEAR(m.fecha_entrega) = %s"
            params.append(year)

        query += f"""
            GROUP BY e.id, e.nombre, e.apellido_paterno, e.apellido_materno, e.codigo_rol, e.activo, e.empleado_imagen
            ORDER BY {order_by_clause}
        """
        # Ejecución de la consulta
        cur.execute(query, params)
        surtidores = cur.fetchall()

        # Paginación
        paginator = Paginator(surtidores, page_size)
        surtidores_page = paginator.get_page(page)

        # Convertir resultados a formato de diccionario
        surtidores_list = [dict(zip([column[0] for column in cur.description], row)) for row in surtidores_page]
        
        # Cerrar la conexión
        cur.close()
        conn.close()

        # Devolver los resultados en formato JSON
        return JsonResponse({
            'total': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': surtidores_page.number,
            'page_size': page_size,
            'results': surtidores_list,
            'has_previous': surtidores_page.has_previous(),
            'has_next': surtidores_page.has_next()
        }, safe=False)

    except m.Error as e:
        print(f"Error: {str(e)}")
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        print(f"Error: {str(e)}")
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)

@csrf_exempt
def get_movimientos_surtidor(request):
    try:
        surtidor_id = request.GET.get('surtidor_id', '')
        desde = request.GET.get('desde', '')
        hasta = request.GET.get('hasta', '')
        year = request.GET.get('year', '')
        order_by = request.GET.get('order_by', 'fecha_movimiento')
        order_dir = request.GET.get('order_dir', 'desc')

        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()

        # Construir la consulta SQL con filtros
        order_by_clause = f"{order_by} {order_dir.upper()}, folio DESC"

        query = f"""
            SELECT m.id, m.fecha_movimiento, m.condicion, m.folio, m.tipo_movimiento, m.almacen, m.cliente, m.sucursal, m.cantidad_pedida, m.cantidad_entregada,
             m.importe_entregado, m.iva_entregado, m.descuento_entregado, m.total_entregado, m.fecha_entrega, m.fecha_surtiendo FROM home_movimiento m
            INNER JOIN home_movimientodetalle md ON m.id = md.movimiento_id
            WHERE m.surtidor_inicio_id = %s AND m.fecha_entrega IS NOT NULL
            GROUP BY m.id
        """
        params = [surtidor_id]

        if desde:
            desde = datetime.strptime(desde, "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0)
            query += " AND m.fecha_entrega >= %s"
            params.append(desde)
        if hasta:
            hasta = datetime.strptime(hasta, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=0)
            query += " AND m.fecha_entrega <= %s"
            params.append(hasta)

        if year:
            query += " AND YEAR(fecha_entrega) = %s"
            params.append(year)
        
        query += f" ORDER BY {order_by_clause}"

        cur.execute(query, params)
        movimientos = cur.fetchall()

        # Convertir a lista de diccionarios
        movimientos_list = [dict(zip([column[0] for column in cur.description], row)) for row in movimientos]

        cur.close()
        conn.close()

        return JsonResponse(movimientos_list, safe=False)
    except m.Error as e:
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)
    
@csrf_exempt
def get_movimientodetalle_surtidor(request):
    try:
        movimiento_id = request.GET.get('movimiento_id', '')

        conn = m.connect(
            host=ENV_MYSQL_HOST,
            user=ENV_MYSQL_USER,
            password=ENV_MYSQL_PASSWORD,
            database=ENV_MYSQL_NAME,
            port=ENV_MYSQL_PORT
        )
        cur = conn.cursor()
        cur.execute("""SELECT m.fecha_entrega, md.codigo_producto, md.producto, md.factor_um, md.cantidad_pedida, md.cantidad_entregada, 
                    md.unidad_medida, md.importe_entregado, md.iva_entregado, md.descuento_entregado, md.total_entregado, md.observacion FROM home_movimientodetalle md 
                    INNER JOIN home_movimiento m ON md.movimiento_id = m.id
                    WHERE movimiento_id = %s;""", (movimiento_id,))
        movimiento_detalle = cur.fetchall()

        movimiento_detalle_list = [dict(zip([column[0] for column in cur.description], row)) for row in movimiento_detalle]
        cur.close()
        conn.close()

        return JsonResponse(movimiento_detalle_list, safe=False)
    except Exception as e:
        print(f"Error: {e}")
        return JsonResponse({'error': str(e)}, status=500)
    

#Proceso para obtener las ventas de AdminTotal y guardarlas en MySQL
@csrf_exempt
def get_empleados_admin_to_mysql(request):
    try:
        conn = p.connect(dbname=ENV_PSQL_NAME, user=ENV_PSQL_USER, host=ENV_PSQL_HOST, password=ENV_PSQL_PASSWORD, port=ENV_PSQL_PORT)
        cur = conn.cursor()
        cur.execute(f"""
            SELECT
                id,
                nombre, 
                apellido_paterno, 
                apellido_materno, 
                CASE 
                    WHEN sexo = 1 THEN 'Hombre' 
                    WHEN sexo = 2 THEN 'Mujer' 
                    ELSE 'Indefinido' 
                END AS genero, 
                rfc, 
                curp,
                clave,
                esta_activo, 
                fecha_nacimiento, 
                email_adicional,
                celular,
                foto_empleado 
            FROM {ENV_SCHEMA}.admintotal_empleado;
        """)
        empleados = cur.fetchall()
        cur.close()
        conn.close()

        conn_m = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur_m = conn_m.cursor()
        cur_m.execute("SELECT clave_empleado FROM home_empleado;")
        empleados_m = cur_m.fetchall()

        arr_clave_empleado_m = [empleado[0] for empleado in empleados_m]

        for empleado in empleados:
            clave_empleado = empleado[7]
            if clave_empleado not in arr_clave_empleado_m:
                cur_m.execute("""
                    INSERT INTO home_empleado (
                        id_admin, nombre, apellido_paterno, apellido_materno, sexo, rfc, curp, clave_empleado, activo, fecha_nacimiento, email, celular, empleado_imagen, usuario_registro_id, fecha_registro
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, (
                    empleado[0], empleado[1], empleado[2], empleado[3], empleado[4], empleado[5], empleado[6], clave_empleado, empleado[8], empleado[9], empleado[10], empleado[11], empleado[12], 1, datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                ))
            else:
                cur_m.execute("""
                    UPDATE home_empleado SET
                        nombre = %s, apellido_paterno = %s, apellido_materno = %s, sexo = %s, rfc = %s, curp = %s, activo = %s, fecha_nacimiento = %s, email = %s, celular = %s, empleado_imagen = %s, usuario_modificacion_id = %s, fecha_modificacion = %s
                    WHERE clave_empleado = %s;
                """, (
                    empleado[1], empleado[2], empleado[3], empleado[4], empleado[5], empleado[6], empleado[8], empleado[9], empleado[10], empleado[11], empleado[12], 1, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), clave_empleado
                ))

        conn_m.commit()
        cur_m.close()
        conn_m.close()

        get_movimientos_admin_to_mysql()
        return HttpResponse("Actualizado todo correctamente.")
    except Exception as e:
        print(f"Error en get_empleados_admin_to_mysql: {str(e)}")


def get_movimientos_admin_to_mysql():
    try:
        # Conexión a la base de datos local
        mysql_conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        mysql_cur = mysql_conn.cursor()
        mysql_query = f""" SELECT MAX(fecha_movimiento) FROM home_movimiento"""
        mysql_cur.execute(mysql_query, [])
        fecha_maxima = mysql_cur.fetchone()
        mysql_cur.close()
        mysql_conn.close()
        #fecha maxima en formato 2024-12-17 15:40:14.257465-07 y restarle 1 dia y dejarlo en formato 2024-12-16 00:00:00
        fecha_maxima = fecha_maxima[0]
        if fecha_maxima is not None:
            fecha_maxima = fecha_maxima - timedelta(days=1)
            fecha_maxima = fecha_maxima.replace(hour=0, minute=0, second=0, microsecond=0)
            fecha_maxima = fecha_maxima.strftime('%Y-%m-%d %H:%M:%S')
        
        #Conexión a la base de datos Admintotal
        conn = p.connect(dbname=ENV_PSQL_NAME, user=ENV_PSQL_USER, host=ENV_PSQL_HOST, password=ENV_PSQL_PASSWORD, port=ENV_PSQL_PORT)
        cur = conn.cursor()
        query = f"""
            SELECT 
                m.poliza_ptr_id,
                e.clave AS clave_empleado,
                p.fecha,
                uc.nombre AS condicion, 
                a.nombre AS almacen, 
                m.folio, 
                m.serie,
                m.folio_adicional,
                CASE
                    WHEN c.codigo IS NOT NULL OR c.codigo != '' THEN c.codigo || ' ' || COALESCE(c.razon_social, m.descripcion_cliente)  -- Si c.razon_social es NULL, se usará de.nombre
                    ELSE COALESCE(c.razon_social, m.descripcion_cliente)  -- Si c.razon_social es NULL, se usará de.nombre
                END AS cliente,
                de.nombre AS sucursal, 
                m.nota_pagada AS pagado,
                    CASE
                    WHEN m.metodo_pago IS NULL OR m.metodo_pago = '' OR m.metodo_pago = '99' THEN '99 Por definir'
                    WHEN m.metodo_pago = '01' THEN '01 Efectivo'
                    WHEN m.metodo_pago = '02' THEN '02 Cheque nominativo'
                    WHEN m.metodo_pago = '03' THEN '03 Transferencia electrónica de fondos'
                    WHEN m.metodo_pago = '04' THEN '04 Tarjeta de crédito'
                    WHEN m.metodo_pago = '05' THEN '05 Monedero electrónico'
                    WHEN m.metodo_pago = '06' THEN '06 Dinero electrónico'
                    WHEN m.metodo_pago = '08' THEN '08 Vales de despensa'
                    WHEN m.metodo_pago = '12' THEN '12 Dación en pago'
                    WHEN m.metodo_pago = '13' THEN '13 Pago por subrogación'
                    WHEN m.metodo_pago = '14' THEN '14 Pago por consignación'
                    WHEN m.metodo_pago = '15' THEN '15 Condonación'
                    WHEN m.metodo_pago = '17' THEN '17 Compensación'
                    WHEN m.metodo_pago = '23' THEN '23 Novación'
                    WHEN m.metodo_pago = '24' THEN '24 Confusión'
                    WHEN m.metodo_pago = '25' THEN '25 Remisión de deuda'
                    WHEN m.metodo_pago = '26' THEN '26 Prescripción o caducidad'
                    WHEN m.metodo_pago = '27' THEN '27 A satisfacción del acreedor'
                    WHEN m.metodo_pago = '28' THEN '28 Tarjeta de débito'
                    WHEN m.metodo_pago = '29' THEN '29 Tarjeta de servicio'
                    WHEN m.metodo_pago = '30' THEN '30 Aplicación de anticipos'
                    WHEN m.metodo_pago = '31' THEN '31 Intermediario pagos'
                END AS metodo_pago,
                CASE
                    WHEN ROUND(SUM(md.cantidad*md.factor_um), 2) IS NULL THEN 0 
                    ELSE ROUND(SUM(md.cantidad*md.factor_um), 2)
                END AS cantidad_total,
                ROUND(m.importe, 2) AS importe, 
                ROUND(m.iva, 2) AS iva, 
                ROUND(m.descuento, 2) AS descuento,
                ROUND(m.total, 2) AS total,
                ROUND(m.costo_venta,2) AS costo_venta, 
                ROUND((m.importe - m.costo_venta),2) AS utilidad,
                mx.nombre AS moneda,
                m.orden_id as orden_id,
                CASE
                    WHEN m.tipo_movimiento = 13 THEN 'Pedido'
                    WHEN m.tipo_movimiento = 33 THEN 'Remisión'
                END AS tipo_movimiento,
                m.cancelado,
                CASE
                    WHEN m2.folio IS NOT NULL OR m.tipo_movimiento = 2 THEN true
                    ELSE false
                END AS facturado,
                CASE
                    WHEN m.poliza_ptr_id = mmd.from_movimiento_id THEN true
                    ELSE false
                END AS devolucion,
                CASE
                    WHEN M.entregar_domicilio = true THEN true
                    ELSE false
                END AS solo_domicilio,
                CASE
                    WHEN M.entregar_domicilio = true AND m.cobrase_devuelvase = true THEN true
                    ELSE false
                END AS cod,
                CASE
                    WHEN m.status = 1 THEN 'Pendiente'
                    WHEN m.status = 2 THEN 'Parcial'
                    WHEN m.status = 3 THEN 'Vendido'
                    WHEN m.status = 24 THEN 'Cancelado'
                    ELSE 'Incidencia'
                END AS status
            FROM 
                {ENV_SCHEMA}.admintotal_movimiento m
            LEFT JOIN 
                {ENV_SCHEMA}.admintotal_empleado e ON e.id = m.vendedor_id
            INNER JOIN
                {ENV_SCHEMA}.admintotal_poliza p ON p.id = m.poliza_ptr_id 
            LEFT JOIN 
                {ENV_SCHEMA}.admintotal_almacen a ON a.id = m.almacen_id
            LEFT JOIN 
                {ENV_SCHEMA}.utils_condicion uc ON uc.id = m.condicion_id
            LEFT JOIN 
                {ENV_SCHEMA}.admintotal_cliente c ON c.id = m.proveedor_id
            LEFT JOIN 
                {ENV_SCHEMA}.admintotal_direccionentrega de ON de.id = m.direccion_entrega_id
            LEFT JOIN 
                {ENV_SCHEMA}.admintotal_moneda mn ON mn.id = m.moneda_id
            LEFT JOIN 
                {ENV_SCHEMA}.admintotal_movimientodetalle md ON md.movimiento_id = m.poliza_ptr_id
            LEFT JOIN
                {ENV_SCHEMA}.admintotal_movimiento m2 ON m2.poliza_ptr_id = m.orden_id
            LEFT JOIN
                {ENV_SCHEMA}.admintotal_movimiento_movimientos_devolucion mmd ON mmd.from_movimiento_id = m.poliza_ptr_id
            LEFT JOIN
                {ENV_SCHEMA}.admintotal_moneda mx ON mx.id = m.moneda_id
            WHERE m.tipo_movimiento IN (13, 33)
            """
        if fecha_maxima:
            query += f" AND p.fecha >= '{fecha_maxima}'"
        else:
            query += f""" AND p.fecha >= '{ENV_YEAR}-{ENV_MONTH}-{ENV_DAY}'"""
        query += f"""
            GROUP BY 
                m.poliza_ptr_id,
                e.clave,
                p.fecha, 
                uc.nombre, 
                a.nombre, 
                m.folio,
                c.codigo,
                c.razon_social, 
                de.nombre, 
                m.nota_pagada, 
                m.importe, 
                m.iva, 
                m.total, 
                m.costo_venta, 
                m.cancelado,
                mmd.from_movimiento_id,
                m2.folio,
                mx.nombre,
                m.orden_id,
                m.tipo_movimiento,
                m.status
            ORDER BY p.fecha DESC, m.folio DESC;
        """
        cur.execute(query)
        
        movimientos = cur.fetchall()
        cur.close()
        conn.close()

        conn_m = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur_m = conn_m.cursor()
        cur_m.execute("SELECT id_admin FROM home_movimiento")
        movimientos_m = cur_m.fetchall()

        arr_id_movimiento_m = [movimiento[0] for movimiento in movimientos_m]

        for movimiento in movimientos:
            movimiento_admin_id = movimiento[0]

            if movimiento_admin_id not in arr_id_movimiento_m:
                cur_m.execute("""
                    INSERT INTO home_movimiento (
                        id_admin, empleado_id, 
                        fecha_movimiento, condicion, 
                        almacen, folio, serie, 
                        folio_adicional, cliente, 
                        sucursal, pagado, metodo_pago, 
                        cantidad_pedida, importe_pedido, 
                        iva_pedido, descuento_pedido, 
                        total_pedido, costo_venta, utilidad, 
                        moneda, orden_id_admin, tipo_movimiento, 
                        cancelado, facturado, devolucion, 
                        solo_domicilio, cod, status) VALUES (%s, (SELECT id FROM home_empleado WHERE clave_empleado = %s), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                            """, (movimiento[0], movimiento[1], movimiento[2], movimiento[3], movimiento[4], movimiento[5], movimiento[6], movimiento[7], movimiento[8], movimiento[9], movimiento[10], movimiento[11], movimiento[12], movimiento[13], movimiento[14], movimiento[15], movimiento[16], movimiento[17], movimiento[18], movimiento[19], movimiento[20], movimiento[21], movimiento[22], movimiento[23], movimiento[24], movimiento[25], movimiento[26], movimiento[27]))
            else:
                cur_m.execute(""" UPDATE home_movimiento SET
                    empleado_id = (SELECT id FROM home_empleado WHERE clave_empleado = %s),
                    fecha_movimiento = %s, condicion = %s, almacen = %s, folio = %s, serie = %s, folio_adicional = %s, cliente = %s, sucursal = %s, pagado = %s, metodo_pago = %s, cantidad_pedida = %s, importe_pedido = %s, iva_pedido = %s, descuento_pedido = %s, total_pedido = %s, costo_venta = %s, utilidad = %s, moneda = %s, orden_id_admin = %s, tipo_movimiento = %s, cancelado = %s, facturado = %s, devolucion = %s, solo_domicilio = %s, cod = %s, status = %s
                    WHERE id_admin = %s;
                """, (movimiento[1], movimiento[2], movimiento[3], movimiento[4], movimiento[5], movimiento[6], movimiento[7], movimiento[8], movimiento[9], movimiento[10], movimiento[11], movimiento[12], movimiento[13], movimiento[14], movimiento[15], movimiento[16], movimiento[17], movimiento[18], movimiento[19], movimiento[20], movimiento[21], movimiento[22], movimiento[23], movimiento[24], movimiento[25], movimiento[26], movimiento[27], movimiento[0]))

        conn_m.commit()
        cur_m.close()
        conn_m.close()

        conn_m2 = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur_m2 = conn_m2.cursor()
        query = f""" SELECT id_admin FROM home_movimiento"""
        if fecha_maxima:
            query += f""" WHERE fecha_movimiento >= '{fecha_maxima}' """
        cur_m2.execute(query)
        movimiento_m2 = cur_m2.fetchall()

        arr_id_movimiento_m2 = [movimiento[0] for movimiento in movimiento_m2]
        
        # Llamar a la función para obtener los deta
        get_movimientodetalle_admin_to_mysql(arr_id_movimiento_m2)
    except Exception as e:
        print(f"Error movimiento: {str(e)}")


def get_movimientodetalle_admin_to_mysql(array_movimiento_admin_id):
    try:
        conn = p.connect(dbname=ENV_PSQL_NAME, user=ENV_PSQL_USER, host=ENV_PSQL_HOST, password=ENV_PSQL_PASSWORD, port=ENV_PSQL_PORT)
        cur = conn.cursor()
        cur.execute(f"""
            SELECT md.id, md.movimiento_id, 
                p.codigo, p.descripcion, um.nombre, md.cantidad, 
                md.factor_um, md.precio_unitario, md.importe, md.iva, 
                md.descuento
                    FROM {ENV_SCHEMA}.admintotal_movimientodetalle md 
                    INNER JOIN {ENV_SCHEMA}.admintotal_movimiento m ON m.poliza_ptr_id = md.movimiento_id
                    INNER JOIN {ENV_SCHEMA}.admintotal_producto p ON p.id = md.producto_id 
                    INNER JOIN {ENV_SCHEMA}.admintotal_um um ON um.id = md.um_id
                    WHERE md.movimiento_id IN %s;
        """, (tuple(array_movimiento_admin_id),))
        movimiento_detalle = cur.fetchall()
        cur.close()
        conn.close()

        conn_m = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur_m = conn_m.cursor()
        cur_m.execute("SELECT id_admin FROM home_movimientodetalle;")
        movimiento_detalle_m = cur_m.fetchall()

        arr_id_movimiento_detalle_m = [movimiento_detalle[0] for movimiento_detalle in movimiento_detalle_m]

        for movimiento_detalle in movimiento_detalle:
            movimiento_detalle_admin_id = movimiento_detalle[0]

            if movimiento_detalle_admin_id not in arr_id_movimiento_detalle_m:
                cur_m.execute("""
                    INSERT INTO home_movimientodetalle (
                        id_admin, movimiento_id, codigo_producto, producto, unidad_medida, cantidad_pedida, factor_um, precio_unitario, importe_pedido, iva_pedido, descuento_pedido, total_pedido, usuario_registro_id, fecha_registro
                    ) VALUES (%s, (SELECT id FROM home_movimiento WHERE id_admin = %s), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, (movimiento_detalle[0], movimiento_detalle[1], movimiento_detalle[2], movimiento_detalle[3], movimiento_detalle[4], movimiento_detalle[5], movimiento_detalle[6], movimiento_detalle[7], movimiento_detalle[8], movimiento_detalle[9], movimiento_detalle[10], (movimiento_detalle[8] + movimiento_detalle[9] - movimiento_detalle[10]), 1, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
            else:
                cur_m.execute("""
                    UPDATE home_movimientodetalle SET
                        movimiento_id = (SELECT id FROM home_movimiento WHERE id_admin = %s),
                        codigo_producto = %s, producto = %s, unidad_medida = %s, cantidad_pedida = %s, factor_um = %s, precio_unitario = %s, importe_pedido = %s, iva_pedido = %s, descuento_pedido = %s, total_pedido = %s, usuario_modificacion_id = %s, fecha_modificacion = %s
                    WHERE id_admin = %s;
                """, (movimiento_detalle[1], movimiento_detalle[2], movimiento_detalle[3], movimiento_detalle[4], movimiento_detalle[5], movimiento_detalle[6], movimiento_detalle[7], movimiento_detalle[8], movimiento_detalle[9], movimiento_detalle[10], (movimiento_detalle[8] + movimiento_detalle[9] - movimiento_detalle[10]), 1, datetime.now().strftime('%Y-%m-%d %H:%M:%S') ,movimiento_detalle[0]))
            
        conn_m.commit()
        cur_m.close()
        conn_m.close()
    except Exception as e:
        print(f"Error movimiento detalle: {str(e)}")

# Función para ejecutar la tarea periódicamente
# def run_periodically(interval, func, *args, **kwargs):
#     def wrapper():
#         while True:
#             func(*args, **kwargs)
#             time.sleep(interval)
#     thread = threading.Thread(target=wrapper)
#     thread.daemon = True
#     thread.start()

# # Iniciar la tarea periódica al iniciar el servidor
# run_periodically(60, get_empleados_admin_to_mysql)  # Ejecutar cada 60 segundos                    

#Surtidores del día:
@csrf_exempt
def get_surtidores_del_dia(request):
    try:
        # Conexión a la base de datos
        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()

        # Consulta SQL con LEFT JOIN para incluir surtidores sin ventas
        query = f"""
            SELECT e.id, e.nombre, e.apellido_paterno, e.apellido_materno, e.codigo_surtidor, 
                COALESCE(SUM(vd.cantidad_entregada), 0) AS piezas, 
                COALESCE(COUNT(vd.id), 0) AS surtidos, 
                e.activo, e.empleado_imagen
            FROM home_empleado e
            LEFT JOIN home_venta v ON v.surtidor_id = e.id
            LEFT JOIN home_ventadetalle vd ON v.id = vd.venta_id
            WHERE DATE(v.fecha_entrega) = CURDATE()
            GROUP BY e.id, e.nombre, e.apellido_paterno, e.apellido_materno, e.codigo_surtidor, e.activo, e.empleado_imagen
        """

        # Ejecución de la consulta
        cur.execute(query, [])
        surtidores = cur.fetchall()

        # Convertir resultados a formato de diccionario
        surtidores_list = [dict(zip([column[0] for column in cur.description], row)) for row in surtidores]
        
        # Cerrar la conexión
        cur.close()
        conn.close()

        # Devolver los resultados en formato JSON
        return JsonResponse({
            'results': surtidores_list
        }, safe=False)

    except m.Error as e:
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)

@csrf_exempt
def get_movimientos_pendientes(request):
    try:
        # Parámetros de filtro
        codigo_movimiento = request.GET.get('codigo_movimiento', '')  # "Remisión" o "Pedido"
        status = request.GET.get('status', '')  # "Pendiente", "Parcial" o "Todos"
        tipo_movimiento = request.GET.get('tipo_movimiento', '')  # "Pedido", "Remisión" o "Todos"
        solo_domicilio = request.GET.get('solo_domicilio', '')  # "true", "false" o "Todos"
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        order_by = request.GET.get('order_by', 'fecha_movimiento')  # Ordenar por columna
        order_dir = request.GET.get('order_dir', 'desc')  # "asc" o "desc"

        # Conexión a la base de datos
        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()

        cur.execute("SELECT orden_id_admin FROM home_movimiento WHERE tipo_movimiento = 'Remisión';")
        orden_id_admin = cur.fetchall()
        arr_orden_id_admin = [movimiento[0] for movimiento in orden_id_admin]

        # Construir la consulta SQL con filtros
        query = """
            SELECT id, fecha_movimiento, folio, folio_adicional, cantidad_pedida, total_pedido, solo_domicilio,
                   fecha_surtiendo, tipo_movimiento, status, codigo_surtidor
            FROM home_movimiento
            WHERE (status = 'Pendiente' OR status = 'Parcial')
            AND fecha_entrega IS NULL
        """
        params = []

        if codigo_movimiento:
            query += " AND folio LIKE %s"
            params.append(codigo_movimiento)

        # Manejar el caso de una lista vacía
        if arr_orden_id_admin:
            # Generar la lista de placeholders para la cláusula NOT IN
            placeholders = ', '.join(['%s'] * len(arr_orden_id_admin))
            
            # Actualizar la consulta con el formato adecuado
            query += f" AND id_admin NOT IN ({placeholders})"
            
            # Agregar los valores de arr_orden_id_admin a los parámetros de la consulta
            params.extend(arr_orden_id_admin)

        # Filtro por status
        if status and status.lower() != 'todos':
            query += " AND LOWER(status) = LOWER(%s)"
            params.append(status)

        # Filtro por tipo_movimiento
        if tipo_movimiento and tipo_movimiento.lower() != 'todos':
            query += " AND LOWER(tipo_movimiento) = LOWER(%s)"
            params.append(tipo_movimiento)

        # Filtro por solo_domicilio
        if solo_domicilio.lower() == 'true':
            query += " AND solo_domicilio = 1"
        elif solo_domicilio.lower() == 'false':
            query += " AND solo_domicilio = 0"

        # Ordenar resultados
        query += f" ORDER BY {order_by} {order_dir.upper()}"

        # Ejecutar la consulta
        cur.execute(query, params)
        movimientos = cur.fetchall()

        # Paginación
        paginator = Paginator(movimientos, page_size)
        movimientos_page = paginator.get_page(page)

        # Convertir resultados a formato de diccionario
        movimientos_list = [dict(zip([column[0] for column in cur.description], row)) for row in movimientos_page]

        # Cerrar la conexión
        cur.close()
        conn.close()

        # Devolver los resultados en formato JSON
        return JsonResponse({
            'total': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': movimientos_page.number,
            'page_size': page_size,
            'results': movimientos_list,
            'has_previous': movimientos_page.has_previous(),
            'has_next': movimientos_page.has_next()
        }, safe=False)

    except m.Error as e:
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        print(f"Error en get_movimientos_pendientes: {str(e)}")
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)

@csrf_exempt
def proceso_surtir(request):
    try:
        data = json.loads(request.body)
        movimiento_id = data['movimiento_id']
        codigo_surtidor = data['codigo_surtidor'] if data['codigo_surtidor'] else None
        
        if not codigo_surtidor:
            return JsonResponse({'error': 'Código de surtidor no proporcionado'}, status=500)
        
        if not movimiento_id:
            return JsonResponse({'error': 'ID de movimiento no proporcionado'}, status=500)

        conn_m = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur_m = conn_m.cursor()

        cur_m.execute(""" SELECT id FROM home_empleado WHERE codigo_rol=%s AND activo = 1 AND rol_id=2;""", (codigo_surtidor,))
        surtidor_id = cur_m.fetchone()

        if not surtidor_id:
            return JsonResponse({'error': 'Código de surtidor incorrecto'}, status=500)

        if surtidor_id:
            try:
                cur_m.execute("""
                    UPDATE home_movimiento
                    SET surtidor_inicio_id = %s, codigo_surtidor = %s, fecha_surtiendo = NOW()
                    WHERE id = %s;
                """, (surtidor_id[0], codigo_surtidor, movimiento_id))
                conn_m.commit()
            except IntegrityError:
                return JsonResponse({'error': 'Error al empezar a surtir el pedido'}, status=500)
        else:
            return JsonResponse({'error': 'Código de surtidor incorrecto'}, status=500)
        
        cur_m.close()
        conn_m.close()

        return JsonResponse({'message': 'El pedido se empezó a surtir'}, safe=False)
    except m.Error as e:
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        print(f"Error en proceso_surtir: {str(e)}")
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)

#Buscar empleado por codigo de surtdor
@csrf_exempt
def get_empleado_by_codigo_surtidor(request):
    try:
        codigo_surtidor = request.GET.get('codigo_surtidor', '')

        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()
        cur.execute("SELECT id, rol_id, codigo_rol FROM home_empleado WHERE codigo_rol = %s AND activo = 1;", (codigo_surtidor,))
        empleado = cur.fetchone()
        if empleado is None:
            return JsonResponse({'error': 'Empleado no encontrado'}, status=404)
        if empleado[1] != 2:
            return JsonResponse({'error': 'El empleado no es un surtidor'}, status=403)
        # Convertir el resultado a un diccionario
        empleado = {
            'id': empleado[0],
            'rol_id': empleado[1],
            'codigo_rol': empleado[2]
        }
        cur.close()
        conn.close()

        return JsonResponse(empleado, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

#Obtiene la nota de venta por folio
@csrf_exempt
def get_venta_by_folio(request):
    try:
        data = json.loads(request.body)
        folio = data['folio']
        
        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()
        cur.execute("SELECT id,folio FROM home_venta WHERE folio = %s AND fecha_entrega IS NULL", (folio,))
        venta = cur.fetchone()
        
        cur.close()
        conn.close()

        return JsonResponse(venta, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def get_movimientos_entregados(request):
    try:
        # Parámetros de filtro
        codigo_movimiento = request.GET.get('codigo_movimiento', '')  # "Remisión" o "Pedido"
        status = request.GET.get('status', '')  # "Pendiente", "Parcial" o "Todos"
        tipo_movimiento = request.GET.get('tipo_movimiento', '')  # "Pedido", "Remisión" o "Todos"
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        order_by = request.GET.get('order_by', 'fecha_movimiento')  # Ordenar por columna
        order_dir = request.GET.get('order_dir', 'desc')  # "asc" o "desc"

        # Conexión a la base de datos
        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()

        cur.execute("SELECT orden_id_admin FROM home_movimiento WHERE tipo_movimiento = 'Remisión';")
        orden_id_admin = cur.fetchall()
        arr_orden_id_admin = [movimiento[0] for movimiento in orden_id_admin]

        # Construir la consulta SQL con filtros
        query = """
            SELECT id, fecha_movimiento, folio, folio_adicional, cantidad_pedida, cantidad_entregada, total_pedido, solo_domicilio,
                   fecha_surtiendo, tipo_movimiento, status, codigo_surtidor
            FROM home_movimiento
            WHERE (status = 'Pendiente' OR status = 'Parcial' OR status = 'Vendido')
            AND fecha_entrega IS NOT NULL AND solo_domicilio = 1 AND fecha_inicio_repartidor IS NULL
        """
        params = []

        if codigo_movimiento:
            query += " AND folio LIKE %s"
            params.append(codigo_movimiento)

        # Manejar el caso de una lista vacía
        if arr_orden_id_admin:
            # Generar la lista de placeholders para la cláusula NOT IN
            placeholders = ', '.join(['%s'] * len(arr_orden_id_admin))
            
            # Actualizar la consulta con el formato adecuado
            query += f" AND id_admin NOT IN ({placeholders})"
            
            # Agregar los valores de arr_orden_id_admin a los parámetros de la consulta
            params.extend(arr_orden_id_admin)

        # Filtro por status
        if status and status.lower() != 'todos':
            query += " AND LOWER(status) = LOWER(%s)"
            params.append(status)

        # Filtro por tipo_movimiento
        if tipo_movimiento and tipo_movimiento.lower() != 'todos':
            query += " AND LOWER(tipo_movimiento) = LOWER(%s)"
            params.append(tipo_movimiento)

        # Ordenar resultados
        query += f" ORDER BY {order_by} {order_dir.upper()}"

        # Ejecutar la consulta
        cur.execute(query, params)
        movimientos = cur.fetchall()

        # Paginación
        paginator = Paginator(movimientos, page_size)
        movimientos_page = paginator.get_page(page)

        # Convertir resultados a formato de diccionario
        movimientos_list = [
            dict(zip(
                [column[0] for column in cur.description],
                [row[i].encode('utf-8').decode('utf-8', errors='replace') if isinstance(row[i], str) else row[i] for i in range(len(row))]
            )) for row in movimientos_page
        ]

        # Cerrar la conexión
        cur.close()
        conn.close()

        # Devolver los resultados en formato JSON
        return JsonResponse({
            'total': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': movimientos_page.number,
            'page_size': page_size,
            'results': movimientos_list,
            'has_previous': movimientos_page.has_previous(),
            'has_next': movimientos_page.has_next()
        }, safe=False)

    except m.Error as e:
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        print(f"Error en get_movimientos_pendientes: {str(e)}")
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)

@csrf_exempt
def proceso_asignar_repartidor(request):
    try:
        data = json.loads(request.body)
        movimiento_id = data['movimiento_id']
        codigo_surtidor = data['codigo_surtidor'] if data['codigo_surtidor'] else None
        
        if not codigo_surtidor:
            return JsonResponse({'error': 'Código de surtidor no proporcionado'}, status=500)
        
        if not movimiento_id:
            return JsonResponse({'error': 'ID de movimiento no proporcionado'}, status=500)

        conn_m = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur_m = conn_m.cursor()

        cur_m.execute(""" SELECT id FROM home_empleado WHERE codigo_rol=%s AND activo = 1 AND rol_id=2;""", (codigo_surtidor,))
        surtidor_id = cur_m.fetchone()

        if not surtidor_id:
            return JsonResponse({'error': 'Código de surtidor incorrecto'}, status=500)

        if surtidor_id:
            try:
                cur_m.execute("""
                    UPDATE home_movimiento
                    SET surtidor_inicio_id = %s, codigo_surtidor = %s, fecha_surtiendo = NOW()
                    WHERE id = %s;
                """, (surtidor_id[0], codigo_surtidor, movimiento_id))
                conn_m.commit()
            except IntegrityError:
                return JsonResponse({'error': 'Error al empezar a surtir el pedido'}, status=500)
        else:
            return JsonResponse({'error': 'Código de surtidor incorrecto'}, status=500)
        
        cur_m.close()
        conn_m.close()

        return JsonResponse({'message': 'El pedido se empezó a surtir'}, safe=False)
    except m.Error as e:
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        print(f"Error en proceso_surtir: {str(e)}")
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)
    

@csrf_exempt
def get_empleado_by_codigo_panel(request):
    try:
        codigo_panel = request.GET.get('codigo_panel', '')

        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()
        cur.execute("SELECT id, rol_id, codigo_rol FROM home_empleado WHERE codigo_rol = %s AND activo = 1;", (codigo_panel,))
        empleado = cur.fetchone()
        
        if empleado is None:
            return JsonResponse({'error': 'Empleado no encontrado'}, status=404)
        if empleado[1] != 3:
            return JsonResponse({'error': 'El empleado no es un surtidor'}, status=403)
        # Convertir el resultado a un diccionario
        empleado = {
            'id': empleado[0],
            'rol_id': empleado[1],
            'codigo_rol': empleado[2].encode('utf-8').decode('utf-8', errors='replace') if isinstance(empleado[2], str) else empleado[2]
        }
        cur.close()
        conn.close()

        return JsonResponse(empleado, safe=False)
    except Exception as e:
        print(e)
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def get_repartidores(request):
    try:
        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()
        cur.execute("SELECT id, nombre, apellido_paterno, apellido_materno, codigo_rol FROM home_empleado WHERE rol_id = 4 AND activo = 1 AND codigo_rol IS NOT NULL;")
        repartidores = cur.fetchall()
        cur.close()
        conn.close()

        # Convertir los resultados a una lista de diccionarios
        repartidores = [
            {
             'id': r[0], 
             'nombre': r[1].encode('utf-8').decode('utf-8', errors='replace') if isinstance(r[1], str) else r[1],
             'apellido_paterno': r[2].encode('utf-8').decode('utf-8', errors='replace') if isinstance(r[2], str) else r[2],
             'apellido_materno': r[3].encode('utf-8').decode('utf-8', errors='replace') if isinstance(r[3], str) else r[3], 
             'codigo_rol': r[4].encode('utf-8').decode('utf-8', errors='replace') if isinstance(r[4], str) else r[4]
             }
            for r in repartidores
        ]
        return JsonResponse(repartidores, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
@csrf_exempt
def update_panel_repartidor_movimiento(request):
    try:
        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()
        data = json.loads(request.body)
        movimiento_id = data['movimiento_id']
        repartidor_id = data['repartidor_id']
        panel_id = data['panel_id']
        codigo_panel = data['codigo_panel']
        codigo_repartidor = data['codigo_repartidor']
        if not movimiento_id:
            return JsonResponse({'error': 'ID de movimiento no proporcionado'}, status=500)
        
        if not repartidor_id:
            return JsonResponse({'error': 'ID de repartidor no proporcionado'}, status=500)
        
        cur.execute("""
            UPDATE home_movimiento SET 
                repartidor_id = %s, 
                panel_id = %s,
                fecha_inicio_repartidor = NOW(),
                codigo_panel = %s,
                codigo_repartidor = %s
            WHERE id = %s;
        """, (repartidor_id, panel_id, codigo_panel, codigo_repartidor, movimiento_id))
        conn.commit()
        cur.close()
        conn.close()

        return JsonResponse({'message': 'Movimiento actualizado correctamente'}, safe=False)
    except m.Error as e:
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        print(f"Error en update_panel_repartidor_movimiento: {str(e)}")
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)
    

########################################
#####################################    
@csrf_exempt
def get_movimientos_entregados_domicilio(request):
    try:
        # Parámetros de filtro
        codigo_movimiento = request.GET.get('codigo_movimiento', '')  # "Remisión" o "Pedido"
        status = request.GET.get('status', '')  # "Pendiente", "Parcial" o "Todos"
        tipo_movimiento = request.GET.get('tipo_movimiento', '')  # "Pedido", "Remisión" o "Todos"
        page = int(request.GET.get('page', 1))
        codigo_repartidor = request.GET.get('codigo_repartidor', '')
        page_size = int(request.GET.get('page_size', 10))
        order_by = request.GET.get('order_by', 'fecha_movimiento')  # Ordenar por columna
        order_dir = request.GET.get('order_dir', 'desc')  # "asc" o "desc"

        # Conexión a la base de datos
        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()

        cur.execute("SELECT orden_id_admin FROM home_movimiento WHERE tipo_movimiento = 'Remisión';")
        orden_id_admin = cur.fetchall()
        arr_orden_id_admin = [movimiento[0] for movimiento in orden_id_admin]

        # Construir la consulta SQL con filtros
        query = """
            SELECT id, fecha_movimiento, folio, folio_adicional, cantidad_pedida, cantidad_entregada, total_pedido, solo_domicilio,
                   fecha_surtiendo, tipo_movimiento, status, codigo_surtidor
            FROM home_movimiento
            WHERE (status = 'Pendiente' OR status = 'Parcial' OR status = 'Vendido')
            AND fecha_entrega IS NOT NULL AND solo_domicilio = 1 AND fecha_inicio_repartidor IS NOT NULL
            AND fecha_final_repartidor IS NULL AND repartidor_id IS NOT NULL AND codigo_repartidor = %s
        """
        params = [codigo_repartidor]

        if codigo_movimiento:
            query += " AND folio LIKE %s"
            params.append(codigo_movimiento)

        # Manejar el caso de una lista vacía
        if arr_orden_id_admin:
            # Generar la lista de placeholders para la cláusula NOT IN
            placeholders = ', '.join(['%s'] * len(arr_orden_id_admin))
            
            # Actualizar la consulta con el formato adecuado
            query += f" AND id_admin NOT IN ({placeholders})"
            
            # Agregar los valores de arr_orden_id_admin a los parámetros de la consulta
            params.extend(arr_orden_id_admin)

        # Filtro por status
        if status and status.lower() != 'todos':
            query += " AND LOWER(status) = LOWER(%s)"
            params.append(status)

        # Filtro por tipo_movimiento
        if tipo_movimiento and tipo_movimiento.lower() != 'todos':
            query += " AND LOWER(tipo_movimiento) = LOWER(%s)"
            params.append(tipo_movimiento)

        # Ordenar resultados
        query += f" ORDER BY {order_by} {order_dir.upper()}"

        # Ejecutar la consulta
        cur.execute(query, params)
        movimientos = cur.fetchall()

        # Paginación
        paginator = Paginator(movimientos, page_size)
        movimientos_page = paginator.get_page(page)

        # Convertir resultados a formato de diccionario y decodificar a UTF-8
        movimientos_list = [
            dict(zip(
                [column[0] for column in cur.description],
                [row[i].encode('utf-8').decode('utf-8', errors='replace') if isinstance(row[i], str) else row[i] for i in range(len(row))]
            )) for row in movimientos_page
        ]

        # Cerrar la conexión
        cur.close()
        conn.close()

        # Devolver los resultados en formato JSON
        return JsonResponse({
            'total': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': movimientos_page.number,
            'page_size': page_size,
            'results': movimientos_list,
            'has_previous': movimientos_page.has_previous(),
            'has_next': movimientos_page.has_next()
        }, safe=False)

    except m.Error as e:
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        print(f"Error en get_movimientos_pendientes: {str(e)}")
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)

@csrf_exempt
def get_empleado_by_codigo_repartidor(request):
    try:
        codigo_repartidor = request.GET.get('codigo_repartidor', '')

        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()
        cur.execute("SELECT id, rol_id, codigo_rol FROM home_empleado WHERE codigo_rol = %s AND activo = 1;", (codigo_repartidor,))
        empleado = cur.fetchone()
        
        if empleado is None:
            return JsonResponse({'error': 'Empleado no encontrado'}, status=404)
        if empleado[1] != 4:
            return JsonResponse({'error': 'El empleado no es un surtidor'}, status=403)
        # Convertir el resultado a un diccionario y decodificar a UTF-8
        empleado = {
            'id': empleado[0],
            'rol_id': empleado[1],
            'codigo_rol': empleado[2].encode('utf-8').decode('utf-8', errors='replace') if isinstance(empleado[2], str) else empleado[2]
        }
        cur.close()
        conn.close()

        return JsonResponse(empleado, safe=False)
    except Exception as e:
        print(e)
        return JsonResponse({'error': str(e)}, status=500)
    
@csrf_exempt
def update_movimiento_repartidor(request):
    try:
        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()
        data = json.loads(request.body)
        movimiento_id = data['movimiento_id']
        codigo_repartidor = data['codigo_repartidor']

        if not codigo_repartidor:
            return JsonResponse({'error': 'Código de repartidor no proporcionado'}, status=500)
        
        cur.execute(""" SELECT id FROM home_empleado WHERE codigo_rol=%s AND activo = 1 AND rol_id=4;""", (codigo_repartidor,))
        repartidor_id = cur.fetchone()

        if not repartidor_id:
            return JsonResponse({'error': 'Código de repartidor incorrecto'}, status=500)
        
        cur.execute("""
            UPDATE home_movimiento SET 
                fecha_final_repartidor = NOW()
            WHERE id = %s;
        """, (movimiento_id,))
        conn.commit()
        cur.close()
        conn.close()

        return JsonResponse({'message': 'Movimiento actualizado correctamente'}, safe=False)
    except m.Error as e:
        print(f"Error en update_movimiento_repartidor: {str(e)}")
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        print(f"Error en update_panel_repartidor_movimiento: {str(e)}")
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)

@csrf_exempt
def get_reporte_repartidores(request):
    try:
        # Obtención de parámetros de la solicitud
        search = request.GET.get('search', '').encode('utf-8').decode('utf-8', errors='replace')  # Asegurar codificación UTF-8
        desde = request.GET.get('desde', '')
        hasta = request.GET.get('hasta', '')
        activo = request.GET.get('activo', '')  # Todos, activos, inactivos
        repartidor_sin_clave = request.GET.get('repartidor_sin_clave', '')  # Con clave, sin clave
        year = request.GET.get('year', '')
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        order_by = request.GET.get('order_by', 'nombre')
        order_dir = request.GET.get('order_dir', 'asc')

        # Conexión a la base de datos
        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()

        # Construir la cláusula de ordenación
        if order_by == 'e.codigo_repartidor':
            order_by_clause = f"CASE WHEN e.codigo_rol IS NULL OR e.codigo_rol = '' THEN 1 ELSE 0 END, e.codigo_rol {order_dir.upper()}"
        else:
            order_by_clause = f"{order_by} {order_dir.upper()}"

        # Lógica para manejar 'activo'
        if activo == '1':
            activo_clause = "AND e.activo = 1"
        elif activo == '0':
            activo_clause = "AND e.activo = 0"
        else:
            activo_clause = ""  # No se añade la condición de activo

        # Consulta SQL con LEFT JOIN para incluir surtidores sin ventas
        query = f"""
            SELECT e.id, e.nombre, e.apellido_paterno, e.apellido_materno, e.codigo_rol, 
                COALESCE(SUM(CASE WHEN md.cantidad_entregada IS NOT NULL AND md.cantidad_entregada != 0 THEN md.cantidad_entregada ELSE 0 END), 0) AS piezas,
                COALESCE(COUNT(DISTINCT m.fecha_final_repartidor), 0) AS repartidos,
                e.activo, e.empleado_imagen
            FROM home_empleado e
            LEFT JOIN home_movimiento m ON m.repartidor_id = e.id
            LEFT JOIN home_movimientodetalle md ON m.id = md.movimiento_id
            WHERE (%s = '' OR e.nombre LIKE %s OR e.apellido_paterno LIKE %s OR e.apellido_materno LIKE %s OR e.codigo_rol LIKE %s)
            {activo_clause}
            AND (
                (%s = 'con_clave' AND e.codigo_rol IS NOT NULL)
                OR (%s = 'sin_clave' AND e.codigo_rol IS NULL AND md.id IS NOT NULL)
                OR (%s = '' AND (md.id IS NOT NULL OR e.codigo_rol IS NOT NULL))
            )
            AND e.rol_id = 4
        """

        params = [search, f'%{search}%', f'%{search}%', f'%{search}%', f'%{search}%', repartidor_sin_clave, repartidor_sin_clave, repartidor_sin_clave]

        # Agregar filtros de fecha si existen
        if desde:
            desde = datetime.strptime(desde, "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0)
            query += " AND m.fecha_entrega >= %s"
            params.append(desde)
        if hasta:
            hasta = datetime.strptime(hasta, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=0)
            query += " AND m.fecha_entrega <= %s"
            params.append(hasta)

        if year:
            query += " AND YEAR(m.fecha_entrega) = %s"
            params.append(year)

        query += f"""
            GROUP BY e.id, e.nombre, e.apellido_paterno, e.apellido_materno, e.codigo_rol, e.activo, e.empleado_imagen
            ORDER BY {order_by_clause}
        """
        # Ejecución de la consulta
        cur.execute(query, params)
        repartidores = cur.fetchall()

        # Paginación
        paginator = Paginator(repartidores, page_size)
        repartidores_page = paginator.get_page(page)

        # Convertir resultados a formato de diccionario y manejar caracteres no ASCII
        repartidor_list = [
            dict(zip(
                [column[0] for column in cur.description],
                [
                    value if not isinstance(value, str) else value.encode("utf-8").decode("utf-8", errors="replace")
                    for value in row
                ]
            ))
            for row in repartidores_page
        ]

        # Cerrar la conexión
        cur.close()
        conn.close()

        # Devolver los resultados en formato JSON
        return JsonResponse({
            'total': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': repartidores_page.number,
            'page_size': page_size,
            'results': repartidor_list,
            'has_previous': repartidores_page.has_previous(),
            'has_next': repartidores_page.has_next()
        }, safe=False)

    except m.Error as e:
        print(f"Error: {str(e)}")
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        print(f"Error: {str(e)}")
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)
    

@csrf_exempt
def get_movimientos_repartidor(request):
    try:
        repartidor_id = request.GET.get('repartidor_id', '')
        desde = request.GET.get('desde', '')
        hasta = request.GET.get('hasta', '')
        year = request.GET.get('year', '')
        order_by = request.GET.get('order_by', 'fecha_movimiento')
        order_dir = request.GET.get('order_dir', 'desc')

        conn = m.connect(host=ENV_MYSQL_HOST, user=ENV_MYSQL_USER, password=ENV_MYSQL_PASSWORD, database=ENV_MYSQL_NAME, port=ENV_MYSQL_PORT)
        cur = conn.cursor()

        # Construir la consulta SQL con filtros
        order_by_clause = f"{order_by} {order_dir.upper()}, folio DESC"

        query = f"""
            SELECT m.id, m.fecha_movimiento, m.condicion, m.folio, m.tipo_movimiento, m.almacen, m.cliente, m.sucursal, m.cantidad_pedida, m.cantidad_entregada,
             m.importe_entregado, m.iva_entregado, m.descuento_entregado, m.total_entregado, m.fecha_entrega, m.fecha_surtiendo FROM home_movimiento m
            INNER JOIN home_movimientodetalle md ON m.id = md.movimiento_id
            WHERE m.repartidor_id = %s AND m.fecha_final_repartidor IS NOT NULL
            GROUP BY m.id
        """
        params = [repartidor_id]

        if desde:
            desde = datetime.strptime(desde, "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0)
            query += " AND m.fecha_entrega >= %s"
            params.append(desde)
        if hasta:
            hasta = datetime.strptime(hasta, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=0)
            query += " AND m.fecha_entrega <= %s"
            params.append(hasta)

        if year:
            query += " AND YEAR(fecha_entrega) = %s"
            params.append(year)
        
        query += f" ORDER BY {order_by_clause}"

        cur.execute(query, params)
        movimientos = cur.fetchall()

        # Convertir a lista de diccionarios y manejar caracteres no ASCII
        movimientos_list = [
            dict(zip(
                [column[0] for column in cur.description],
                [
                    value if not isinstance(value, str) else value.encode("utf-8").decode("utf-8", errors="replace")
                    for value in row
                ]
            ))
            for row in movimientos
        ]

        cur.close()
        conn.close()

        return JsonResponse(movimientos_list, safe=False)
    except m.Error as e:
        return JsonResponse({'error': f"MySQL error: {str(e)}"}, status=500)
    except Exception as e:
        return JsonResponse({'error': f"General error: {str(e)}"}, status=500)
    
@csrf_exempt
def get_movimientodetalle_repartidor(request):
    try:
        movimiento_id = request.GET.get('movimiento_id', '')

        conn = m.connect(
            host=ENV_MYSQL_HOST,
            user=ENV_MYSQL_USER,
            password=ENV_MYSQL_PASSWORD,
            database=ENV_MYSQL_NAME,
            port=ENV_MYSQL_PORT
        )
        cur = conn.cursor()
        cur.execute("""SELECT m.fecha_entrega, md.codigo_producto, md.producto, md.factor_um, md.cantidad_pedida, md.cantidad_entregada, 
                    md.unidad_medida, md.importe_entregado, md.iva_entregado, md.descuento_entregado, md.total_entregado, md.observacion FROM home_movimientodetalle md 
                    INNER JOIN home_movimiento m ON md.movimiento_id = m.id
                    WHERE movimiento_id = %s;""", (movimiento_id,))
        movimiento_detalle = cur.fetchall()

        # Convertir a lista de diccionarios y manejar caracteres no ASCII
        movimiento_detalle_list = [
            dict(zip(
                [column[0] for column in cur.description],
                [
                    value if not isinstance(value, str) else value.encode("utf-8").decode("utf-8", errors="replace")
                    for value in row
                ]
            ))
            for row in movimiento_detalle
        ]
        cur.close()
        conn.close()

        return JsonResponse(movimiento_detalle_list, safe=False)
    except Exception as e:
        print(f"Error: {e}")
        return JsonResponse({'error': str(e)}, status=500)
    
