# -*- encoding: utf-8 -*-
"""
Copyright (c) 2019 - present AppSeed.us
"""

from django.urls import path, re_path
from apps.home import views

urlpatterns = [
    # The home page
    path('', views.index, name='home'),

    # =================== FECHAS =================== #
    path('getYears', views.get_years, name='getYears'),
    path('getMonths', views.get_months, name='getMonths'),
    path('getDays', views.get_days, name='getDays'),

    # ================== PRODUCTOS ================= #
    path('getProducts', views.get_products, name='getProducts'),    
    path('getFolio', views.get_folio, name='getFolio'),

    # ================== CLIENTES ================== #
    path('getClientesNuevos', views.get_clientes_nuevos, name='getClientesNuevos'),
    path('getClientesAusentes', views.get_clientes_ausentes, name='getClientesAusentes'),

    # ================= EMPLEADOS ================== #
    path('getEmpleados', views.get_empleados, name='getEmpleados'),
    path('getEmpleado', views.get_empleado, name='getEmpleado'),    
    path('get_empleado_por_codigo', views.get_empleado_by_codigo_surtidor, name='get_empleado_por_codigo'),
    path('get_empleado_por_codigo_panel', views.get_empleado_by_codigo_panel, name='get_empleado_por_codigo_panel'),
    path('get_empleado_por_codigo_repartidor', views.get_empleado_by_codigo_repartidor, name='get_empleado_por_codigo_repartidor'),
    path('get_repartidores', views.get_repartidores, name='get_repartidores'),
    path('update_empleados', views.update_empleados, name='update_empleados'),        
    path('updateEmpleado', views.update_empleado, name='update_empleado'),
    path('getRoles', views.get_roles, name='getRoles'),

    # ================== MOVIMIENTOS ==================== #
    path('get_movimientos', views.get_movimientos, name='get_movimientos'),    
    path('get_movimiento', views.get_movimiento, name='get_movimiento'),
    path('get_movimiento_detalle', views.get_movimiento_detalle, name='get_movimiento_detalle'),
    path('update_movimiento_detalle', views.update_movimiento_detalle, name='update_movimiento_detalle'),
    path('update_panel_repartidor_movimiento', views.update_panel_repartidor_movimiento, name='update_panel_repartidor_movimiento'),
    path('update_movimiento_repartidor', views.update_movimiento_repartidor, name='update_movimiento_repartidor'),
    path('get_movimientos_pendientes', views.get_movimientos_pendientes, name='get_movimientos_pendientes'),
    path('get_movimientos_entregados', views.get_movimientos_entregados, name='get_movimientos_entregados'),
    path('get_movimientos_entregados_domicilio', views.get_movimientos_entregados_domicilio, name='get_movimientos_entregados_domicilio'),
    path('get_venta_by_folio', views.get_venta_by_folio, name='get_venta_by_folio'),
    path('get_movimientos_admin_to_mysql', views.get_empleados_admin_to_mysql, name='get_movimientos_admin_to_mysql'),
    
    # ================== ALMACEN ================== #
    path('get_almacen', views.get_almacen, name='get_almacen'),

    # ================ SURTIDORES ================= #
    path('get_reporte_surtidores', views.get_reporte_surtidores, name='get_reporte_surtidores'),
    path('get_reporte_repartidores', views.get_reporte_repartidores, name='get_reporte_repartidores'),
    path('get_movimientos_surtidor', views.get_movimientos_surtidor, name='get_movimientos_surtidor'),
    path('get_movimientos_repartidor', views.get_movimientos_repartidor, name='get_movimientos_repartidor'),
    path('get_movimientodetalle_surtidor', views.get_movimientodetalle_surtidor, name='get_movimientodetalle_surtidor'),
    path('get_movimientodetalle_repartidor', views.get_movimientodetalle_repartidor, name='get_movimientodetalle_repartidor'),
    path('get_surtidores_del_dia', views.get_surtidores_del_dia, name='get_surtidores_del_dia'),        
    path('proceso_surtir', views.proceso_surtir, name='proceso_surtir'),
    
    # ================== VENDEDOR ================= #
    path('get_vendedores', views.get_vendedores, name='get_vendedores'),
    path('get_moneda', views.get_moneda, name='get_moneda'),
    path('get_surtidor', views.get_surtidor, name='get_surtidor'),

    # ================= USUARIOS ================== #
    path('getUsuario', views.get_usuario, name='getUsuario'),
    path('getUsuarios', views.get_usuarios, name='get_usuarios'),
    path('updateUsuario', views.update_usuario, name='update_usuario'),

    # Matches any html file
    re_path(r'^.*\.*', views.pages, name='pages'),
]