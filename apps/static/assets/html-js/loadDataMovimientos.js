document.addEventListener('DOMContentLoaded', async function () {
    const movimientosTableBody = document.getElementById('movimientos-table-body');
    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    const updateListButton = document.getElementById('update-list');
    const noResultsRow = document.getElementById('no-results');
    const clearSearchButton = document.getElementById('clear-search');
    const editModalTableBody = document.getElementById('edit-cantidad-detalles');
    const almacenSelect = document.getElementById('almacen');
    const surtidorSelect = document.getElementById('surtidor_select');
    const vendedoresSelect = document.getElementById('vendedor_id');
    const monedaSelect = document.getElementById('moneda');

    let currentPage = 1;
    let totalPages = 1;

    // Función para llenar el select de almacenes
    async function populateAlmacenes() {
        const almacenes = await fetchAlmacenes();
        if (almacenes) {
            almacenSelect.innerHTML = '<option value="">Cualquier almacén</option>'; // Opción por defecto
            almacenes.forEach(almacen => {
                almacenSelect.innerHTML += `<option value="${almacen}">${almacen}</option>`;
            });
        }
    }

    // Función para llenar el select de surtidor
    async function populateSurtidores() {
        const surtidor = await fetchSurtidores();
        if (surtidor || surtidor != []) {
            surtidorSelect.innerHTML = '<option value="">Cualquier Surtidor</option>'; // Opción por defecto
            surtidor.forEach(surtir => {
                const nombreCompleto = `${surtir.nombre} ${surtir.apellido_paterno} ${surtir.apellido_materno}`;
                surtidorSelect.innerHTML += `<option value="${surtir.id}">${nombreCompleto}</option>`;
            });
        }
    }

    // Función para llenar el select de vendedores
    async function populateVendedores() {
        const vendedores = await fetchVendedores();
        if (vendedores) {
            vendedoresSelect.innerHTML = '<option value="">Cualquier Vendedor</option>'; // Opción por defecto
            vendedores.forEach(vendedor => {
                const nombreCompleto = `${vendedor.nombre} ${vendedor.apellido_paterno} ${vendedor.apellido_materno}`;
                vendedoresSelect.innerHTML += `<option value="${vendedor.id}">${nombreCompleto}</option>`;
            });
        }
    }

    // Función para llenar el select de monedas
    async function populateMonedas() {
        const monedas = await fetchMonedas();
        if (monedas) {
            monedaSelect.innerHTML = '<option value="">Cualquier Moneda</option>'; // Opción por defecto
            monedas.forEach(moneda => {
                monedaSelect.innerHTML += `<option value="${moneda}">${moneda}</option>`;
            });
        }
    }

    async function fetchAndRenderMovimientos(page = 1) {
        const search = document.getElementById('search').value;
        const almacen = document.getElementById('almacen').value;
        const vendedorId = document.getElementById('vendedor_id').value;
        const moneda = document.getElementById('moneda').value;
        const soloDomicilio = document.getElementById('domicilio').checked;
        const cod = document.getElementById('cod').checked;
        const surtidorId = document.getElementById('surtidor_select').value;
        const rangoFecha = document.getElementById('rango_fecha').value;

        let fechaInicioFormat = '';
        let fechaFinFormat = '';

        if (rangoFecha) {
            const [fechaInicio, fechaFin] = rangoFecha.split(' hasta ');
            if (fechaInicio) {
                const [diaInicio, mesInicio, anioInicio] = fechaInicio.split('-');
                fechaInicioFormat = `${anioInicio}-${mesInicio.padStart(2, '0')}-${diaInicio.padStart(2, '0')}`;
            }
            if (fechaFin) {
                const [diaFin, mesFin, anioFin] = fechaFin.split('-');
                fechaFinFormat = `${anioFin}-${mesFin.padStart(2, '0')}-${diaFin.padStart(2, '0')}`;
            }
        }

        const condicion = document.getElementById('condicion').value;
        const estado = document.getElementById('estado').value;
        const estatus = document.getElementById('estatus').value;
        const tipo_movimiento = document.getElementById('tipo-movimiento').value;
        const filters = {
            search: search,
            almacen: almacen,
            vendedor_id: vendedorId,
            moneda: moneda,
            surtidor_id: surtidorId,
            domicilio: soloDomicilio ? 'si' : 'no',
            cod: cod ? 'si' : 'no',
            desde: fechaInicioFormat || '',
            hasta: fechaFinFormat || '',
            condicion: condicion,
            estado: estado,
            tipo_movimiento: tipo_movimiento,
            status: estatus === '1' ? 1 : estatus === '0' ? 0 : '',
            page: page,
            page_size: 10
        };

        const data = await fetchMovimientos(filters);

        movimientosTableBody.innerHTML = '';
        if (data.results.length === 0 || data.results == []) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="15" class="text-center">No se encontraron resultados</td>';
            movimientosTableBody.appendChild(row);
            noResultsRow.style.display = 'block';
        } else {
            noResultsRow.style.display = 'none';
            data.results.forEach(movimiento => {
                const row = document.createElement('tr');
                let folio = movimiento.folio_adicional || movimiento.folio || '';
                let pagado = movimiento.pagado ? 'Sí' : 'No';
                let fechaMovimiento = movimiento.fecha_movimiento ? new Date(movimiento.fecha_movimiento).toLocaleString('es-ES') : '';
                let fechaEntrega = movimiento.fecha_entrega ? new Date(movimiento.fecha_entrega).toLocaleString('es-ES') : 'Sin entregar';

                let entrega = '';
                if (movimiento.fecha_surtiendo !== null && movimiento.fecha_entrega === null) {
                    entrega = 'Surtiendo';
                } else if (movimiento.cantidad_entregada == movimiento.cantidad_pedida) {
                    entrega = 'Entrega Completa';
                    row.style.backgroundColor = '#d4edda'; // Verde claro
                } else if (movimiento.cantidad_entregada < movimiento.cantidad_pedida && movimiento.cantidad_entregada !== null && !isNaN(movimiento.cantidad_entregada)) {
                    entrega = 'Entrega Parcial';
                    row.style.backgroundColor = '#f8d7da'; // Rojo claro
                } else {
                    entrega = 'Pendiente';
                }

                row.innerHTML = `
                    <td class="truncate">${fechaMovimiento || ""}</td>
                    <td class="truncate">${movimiento.tipo_movimiento || ""}</td>
                    <td class="truncate">${movimiento.condicion || ""}</td>
                    <td class="truncate">${movimiento.almacen || ""}</td>
                    <td class="truncate">${folio || ""}</td>
                    <td class="truncate">${movimiento.folio_relacionado || "Por facturar"}</td>
                    <td class="truncate">${movimiento.cliente || ""}</td>
                    <td class="truncate">${movimiento.sucursal || ""}</td>
                    <td class="truncate">${movimiento.cantidad_pedida || "0"}</td>
                    <td class="truncate">${movimiento.cantidad_entregada || "0"}</td>
                    <td class="truncate">$${movimiento.total_pedido || "0"}</td>
                    <td class="truncate">$${movimiento.utilidad || "0"}</td>
                    <td class="truncate">${pagado || ""}</td>
                    <td class="truncate">${entrega || ""}</td>
                    <td class="truncate">${fechaEntrega || ""}</td>
                    <td><button class="btn btn-primary btn-sm ver_modal" data-toggle="modal" data-target="#movimientoModal" data-movimiento-id="${movimiento.id}">Ver</button></td>
                `;
                movimientosTableBody.appendChild(row);
            });
        }

        pageInfo.textContent = `Página ${data.current_page} de ${data.num_pages}`;
        prevPageButton.disabled = !data.has_previous;
        nextPageButton.disabled = !data.has_next;
        totalPages = data.num_pages;
        currentPage = data.current_page;
    }

    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('ver_modal')) {
            const movimientoId = event.target.getAttribute('data-movimiento-id');
            showMovimientoModal(movimientoId);
        }
    });

    updateListButton.addEventListener('click', function () {
        fetchAndRenderMovimientos();
    });

    prevPageButton.addEventListener('click', function () {
        if (currentPage > 1) {
            fetchAndRenderMovimientos(currentPage - 1);
        }
    });

    nextPageButton.addEventListener('click', function () {
        if (currentPage < totalPages) {
            fetchAndRenderMovimientos(currentPage + 1);
        }
    });

    clearSearchButton.addEventListener('click', function () {
        document.getElementById('search').value = '';
        document.getElementById('almacen').value = '';
        document.getElementById('vendedor_id').value = '';
        document.getElementById('moneda').value = '';
        document.getElementById('domicilio').checked = false;
        document.getElementById('cod').checked = false;
        document.getElementById('rango_fecha').value = '';
        document.getElementById('condicion').value = '';
        document.getElementById('estado').value = '';
        document.getElementById('estatus').value = '';
        document.getElementById('tipo-movimiento').value = '';
        document.getElementById('surtidor_select').value = '';
        fetchAndRenderMovimientos();
    });

    // Reemplazar mensaje de error o exito
    function showMessage(message, type) {
        showToastMessage(message, type);
    }

    document.getElementById('edit-movimiento').addEventListener('click', function () {
        $('#editCantidadModal').modal('show');
    });

    document.getElementById('EntregarModalSaveEditar').addEventListener('click', async function () {
        try {
            const movimientoId = document.getElementById('EntregarModal_movimientoId').value;
            const codigoSurtidor = document.getElementById('EntregarModal_codigoSurtidor').value;
            console.log('Código de surtidor:', codigoSurtidor);
            console.log('Movimiento ID:', movimientoId);
    
            if (!codigoSurtidor) {
                showMessage('Proporcione el código de surtidor.', 'error');
                return;
            }
    
            const empleado = await fetchEmpleadoByCodigoSurtidor(codigoSurtidor);
            if (!empleado) {
                showMessage('Surtidor no existente.', 'error');
                return;
            }
    
            if (empleado.rol_id !== 2) {
                showMessage('El código no es de surtidor.', 'error');
                return;
            }
    
            const codigoRol = document.getElementById('EntregarModal_codigoRol').value;
            if (empleado.codigo_rol !== codigoRol) {
                showMessage('El código de surtidor no coincide con el que empezó a surtir.', 'error');
                return;
            }

            showMessage('Código de surtidor válido.', 'success');
    
            // Mostrar la tabla y cambiar los botones
            document.getElementById('EntregarModalTable').style.display = 'block';
            document.getElementById('EntregarModalSaveEditar').style.display = 'none';
            document.getElementById('EntregarModalSave').style.display = 'block';
            document.getElementById('codigo-busqueda').style.display = 'block';
            document.getElementById('EntregarModal_codigoSurtidor').readOnly = true;
    
            // Cargar los detalles en la tabla
            const detalles = await fetchMovimientoDetalle(movimientoId);
            const editCantidadDetalles = document.getElementById('edit-cantidad-detalles');
            editCantidadDetalles.innerHTML = '';
    
            detalles.forEach(detalle => {
                const row = document.createElement('tr');
                row.setAttribute('data-id', detalle.id);
                row.innerHTML = `
                    <td>${detalle.codigo_producto}</td>
                    <td>${detalle.producto}</td>
                    <td>${detalle.cantidad_pedida}</td>
                    <td><input type="number" class="form-control cantidad-entregada-input" max="${detalle.cantidad_pedida}" value="${detalle.cantidad_entregada || 0}"></td>
                    <td><input type="text" class="form-control observaciones-input" value="${detalle.observacion || ''}"></td>
                `;
                editCantidadDetalles.appendChild(row);
            });
        } catch (error) {
            console.error('Error al cargar los detalles:', error);
            showMessage(error.message || 'Hubo un problema al cargar los detalles.', 'error');
        }
    });
    
    document.getElementById('EntregarModalSave').addEventListener('click', async function () {
        try {
            const movimientoId = document.getElementById('EntregarModal_movimientoId').value;
            const surtidorId = document.getElementById('EntregarModal_surtidor').value;
            const detalles = Array.from(document.getElementById('edit-cantidad-detalles').querySelectorAll('tr')).map(row => {
                const cantidadEntregada = parseFloat(row.querySelector('.cantidad-entregada-input').value);
                const maxCantidad = parseFloat(row.querySelector('.cantidad-entregada-input').getAttribute('max'));
                const observaciones = row.querySelector('.observaciones-input').value || '';
    
                if (cantidadEntregada > maxCantidad) {
                    throw new Error(`La cantidad entregada no puede superar la cantidad pedida (${maxCantidad}).`);
                }
    
                return {
                    id: row.dataset.id,
                    cantidad_entregada: cantidadEntregada,
                    observaciones: observaciones
                };
            });
    
            // Verificar si hay cambios en la tabla
            const hasChanges = detalles.some(detalle => {
                const originalRow = document.querySelector(`tr[data-id="${detalle.id}"]`);
                const originalCantidad = parseFloat(originalRow.querySelector('.cantidad-entregada-input').defaultValue);
                const originalObservaciones = originalRow.querySelector('.observaciones-input').defaultValue;
    
                return detalle.cantidad_entregada !== originalCantidad || detalle.observaciones !== originalObservaciones;
            });
    
            if (!hasChanges) {
                showMessage('No se detectaron cambios en la tabla.', 'info');
                return;
            }

            if(!surtidorId){
                showMessage('Hay un fallado al encontrar el surtidor', 'error');
                return;
            }
    
            const result = await updateMovimientoDetalle(movimientoId, surtidorId, detalles);
    
            if (result.error) {
                showMessage(result.error, 'error');
                return;
            }
    
            showMessage('Cantidad entregada actualizada correctamente.', 'success');
            $('#editCantidadModal').modal('hide');
            await fetchAndRenderMovimientos(); // Actualizar la tabla principal
        } catch (error) {
            console.error('Error al guardar los cambios:', error);
            showMessage(error.message || 'Hubo un problema al guardar los cambios.', 'error');
        }
    });

    // Agregar evento de búsqueda por código en venta
    document.getElementById('codigo-busqueda').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = editModalTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const codigo = row.querySelector('td:nth-child(1)').textContent.toLowerCase();
            if (codigo.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });

    // Input number no mayor al atributo max y no menor a 0
    document.addEventListener('input', function (e) {
        if (e.target.tagName.toLowerCase() === 'input' && e.target.type === 'number') {
            const max = parseInt(e.target.getAttribute('max'));
            const min = 0;
            if (parseInt(e.target.value) > max) {
                e.target.value = max;
            } else if (parseInt(e.target.value) < min) {
                e.target.value = min;
            }
        }
    });

    // Agregar evento al botón de "Cancelar" para cerrar el modal
    document.getElementById('cancelar-entrega').addEventListener('click', function () {
        $('#editCantidadModal').modal('hide'); // Cierra el modal
    });

    $('#editCantidadModal').on('show.bs.modal', async function (event) {    
       // Ocultar tabla y botones inicialmente
       $('#movimientoModal').modal('hide');
        document.getElementById('EntregarModalTable').style.display = 'none';
        document.getElementById('EntregarModalSaveEditar').style.display = 'block';
        document.getElementById('EntregarModalSave').style.display = 'none';
        document.getElementById('codigo-busqueda').style.display = 'none';
        document.getElementById('EntregarModal_codigoSurtidor').readOnly = false;
    
        // Limpiar tabla de detalles
        const editCantidadDetalles = document.getElementById('edit-cantidad-detalles');
        editCantidadDetalles.innerHTML = '';

        // un segundo despues de abrir, poner focus en codigoSurtidor
        setTimeout(() => {
            document.getElementById('EntregarModal_codigoSurtidor').focus();
        }, 500);
    });
    
    $('#editCantidadModal').on('hidden.bs.modal', async function () {
        // Resetear el formulario y ocultar elementos al cerrar el modal
        document.getElementById('EntregarModalForm').reset();
        await showMovimientoModal(document.getElementById('EntregarModal_movimientoId').value);
        document.getElementById('EntregarModal_movimientoId').value = '';
        document.getElementById('EntregarModal_codigoRol').value = '';
        document.getElementById('EntregarModalFolio').textContent = '';
        document.getElementById('EntregarModal_codigoSurtidor').value = '';
        document.getElementById('EntregarModal_codigoSurtidor').readOnly = false;
        document.getElementById('EntregarModalTable').style.display = 'none';
        document.getElementById('codigo-busqueda').style.display = 'none';
        document.getElementById('edit-cantidad-detalles').innerHTML = '';
    });

    // Funcion para mostrar mensaje de error o exito
    function showToastMessage(message, type) {
        const toastMessage = document.getElementById('toastMessage');
        const toastMessageBody = document.getElementById('toastMessageBody');
        const toastMessageLabel = document.getElementById('toastMessageLabel');

        toastMessageBody.textContent = message;

        if (type === 'success') {
            toastMessageLabel.textContent = 'Éxito';
            toastMessage.classList.remove('toast-error');
            toastMessage.classList.remove('toast-info');
            toastMessage.classList.add('toast-success');
        } else if (type === 'error') {
            toastMessageLabel.textContent = 'Error';
            toastMessage.classList.remove('toast-success');
            toastMessage.classList.remove('toast-info');
            toastMessage.classList.add('toast-error');
        }else if (type === 'info') {
            toastMessageLabel.textContent = 'Información';
            toastMessage.classList.remove('toast-success');
            toastMessage.classList.remove('toast-error');
            toastMessage.classList.add('toast-info');
        }

        toastMessage.style.display = 'block';

        // Ocultar mensaje después de 5 segundos
        setTimeout(hideToastMessage, 5000);
    }

    // Funcion para ocultar mensaje
    function hideToastMessage() {
        const toastMessage = document.getElementById('toastMessage');
        toastMessage.style.display = 'none';
    }

    // Reemplazar mensaje de error o exito
    function showMessage(message, type) {
        showToastMessage(message, type);
    }

    $(".toast-close").click(function() {
        hideToastMessage();
    });

    //Calendario
    const inputFecha = document.getElementById('rango_fecha');
    const toggleButton = document.querySelector('[data-toggle]');
    const clearButton = document.querySelector('[data-clear]');

    // Inicializar Flatpickr en los campos de fecha
    const datePicker = flatpickr(".flatpickr", {
        dateFormat: "d-m-Y",
        allowInput: false,
        clickOpens: false,
        wrap : true,
        mode: "range",
        locale: {
            firstDayOfWeek: 1,
            weekdays: {
                shorthand: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
                longhand: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
            },
            months: {
                shorthand: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                longhand: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
            },
        },
        maxDate: new Date(),
        onClose: function(selectedDates, dateStr, instance) {
            instance._input.blur();
        },
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
            const newDateStr = dateStr.replace(' to ', ' hasta ');
            instance.input.value = newDateStr;
            }
        }
    });

    // Función para abrir/cerrar el calendario con clic en el botón
    toggleButton.addEventListener('click', function(event) {
        event.preventDefault();  // Prevenir el comportamiento predeterminado del enlace
        if (inputFecha.classList.contains('active')) {
            datePicker.close();
            inputFecha.classList.remove('active');
        } else {
            datePicker.open();
            inputFecha.classList.add('active');
        }
    });

    // Función para abrir/cerrar el calendario con clic en el campo de entrada
    inputFecha.addEventListener('click', function() {
        if (inputFecha.classList.contains('active')) {
            datePicker.close();
            inputFecha.classList.remove('active');
        } else {
            datePicker.open();
            inputFecha.classList.add('active');
        }
    });

    // Función para cerrar el calendario dando clic fuera del campo de entrada
    document.addEventListener('click', function(event) {
        if (!inputFecha.contains(event.target) && !event.target.closest('.flatpickr-calendar')) {
            datePicker.close();
            inputFecha.classList.remove('active');
        }
    });

    // Función para limpiar el campo de fecha
    clearButton.addEventListener('click', function(event) {
        event.preventDefault();  // Prevenir el comportamiento predeterminado del enlace
        datePicker.clear();
        inputFecha.value = '';
        inputFecha.classList.remove('active');
    });

    // Función para formatear fechas
    function formatFecha(fecha) {
        if (!fecha) return 'N/A'; // Manejar fechas nulas o indefinidas
        const opciones = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        };
        return new Date(fecha).toLocaleString('es-ES', opciones);
    }

    async function showMovimientoModal(movimientoId) {
        try {
            // Obtener datos del movimiento
            const movimiento = await fetchMovimiento(movimientoId);
            const detalles = await fetchMovimientoDetalle(movimientoId);
            document.getElementById('EditarModalFolio').textContent = '(Folio: '+movimiento.folio+')';
            document.getElementById('EntregarModal_codigoRol').value = movimiento.codigo_surtidor;
            document.getElementById('EntregarModal_movimientoId').value = movimientoId;
            document.getElementById('EntregarModal_surtidor').value = movimiento.surtidor_inicio_id;
            const fechaMovimiento = formatFecha(movimiento.fecha_movimiento);
            const fechaSurtido = formatFecha(movimiento.fecha_surtiendo);
            const fechaEntrega = formatFecha(movimiento.fecha_entrega);
            const fechaEntregaRepartidor = formatFecha(movimiento.fecha_inicio_repartidor);
            const fechaEntregaRepartidorFin = formatFecha(movimiento.fecha_final_repartidor);
    
            // Parte 1: Información del movimiento
            document.getElementById('empleado-info').textContent = `${movimiento.empleado ? `${movimiento.empleado.clave_empleado} - ${movimiento.empleado.nombre} ${movimiento.empleado.apellido_paterno} ${movimiento.empleado.apellido_materno} `: 'N/A'}`;
            document.getElementById('fecha-movimiento').textContent = fechaMovimiento;
            document.getElementById('condicion2').textContent = movimiento.condicion;
            document.getElementById('almacen2').textContent = movimiento.almacen;
            document.getElementById('folio').textContent = movimiento.tipo_movimiento === 'Remisión' ? `#${movimiento.folio}` : movimiento.folio;
            document.getElementById('folio-pedido').textContent = `${movimiento.tipo_movimiento == "Remisión" ? `${movimiento.folio_remision}` || 'N/A': 'N/A'}`;
            if (movimiento.tipo_movimiento != "Remisión") {
                document.getElementById('folio-pedido-div').style.display = 'none';
            } else {
                document.getElementById('folio-pedido').textContent = `${movimiento.folio_remision}` || 'N/A';
                document.getElementById('folio-pedido-div').style.display = 'block';
            }
            document.getElementById('cliente').textContent = movimiento.cliente;
            document.getElementById('sucursal').textContent = movimiento.sucursal;
            document.getElementById('pagado').textContent = movimiento.pagado ? 'Sí' : 'No';
            document.getElementById('metodo-pago').textContent = movimiento.metodo_pago;
            document.getElementById('cantidad-pedida').textContent = movimiento.cantidad_pedida;
            document.getElementById('importe-pedido').textContent = `$${movimiento.importe_pedido}`;
            document.getElementById('iva-pedido').textContent = `$${movimiento.iva_pedido}`;
            document.getElementById('descuento-pedido').textContent = `$${movimiento.descuento_pedido}`;
            document.getElementById('total-pedido').textContent = `$${movimiento.total_pedido}`;
            document.getElementById('utilidad').textContent = `$${movimiento.utilidad}`;
            document.getElementById('moneda2').textContent = movimiento.moneda;
            document.getElementById('tipo_movimiento').textContent = movimiento.tipo_movimiento;
            document.getElementById('cancelado').textContent = movimiento.cancelado ? 'Sí' : 'No';
            document.getElementById('facturado').textContent = movimiento.facturado ? 'Sí' : 'No';
            document.getElementById('devolucion').textContent = movimiento.devolucion ? 'Sí' : 'No';
            document.getElementById('solo-domicilio').textContent = movimiento.solo_domicilio ? 'Sí' : 'No';
            document.getElementById('cod2').textContent = movimiento.cod ? 'Sí' : 'No';
    
            // Parte 2: Detalles del pedido
            const pedidoDetalles = document.getElementById('pedido-detalles');
            pedidoDetalles.innerHTML = '';
            detalles.forEach(detalle => {
                pedidoDetalles.innerHTML += `
                    <tr>
                        <td>${detalle.codigo_producto}</td>
                        <td>${detalle.producto}</td>
                        <td>${detalle.unidad_medida}</td>
                        <td>${detalle.cantidad_pedida.toFixed(2)}</td>
                        <td>${detalle.factor_um}</td>
                        <td>$${detalle.precio_unitario.toFixed(2)}</td>
                        <td>$${detalle.importe_pedido.toFixed(2)}</td>
                        <td>$${detalle.iva_pedido.toFixed(2)}</td>
                        <td>$${detalle.descuento_pedido.toFixed(2)}</td>
                        <td>$${detalle.total_pedido.toFixed(2)}</td>
                    </tr>
                `;
            });
    
            // Parte 3: Detalles de la entrega
            const entregaDetalles = document.getElementById('entrega-detalles');
            entregaDetalles.innerHTML = '';
            detalles.forEach(detalle => {
                entregaDetalles.innerHTML += `
                    <tr>
                        <td>${detalle.codigo_producto}</td>
                        <td>${detalle.producto}</td>
                        <td>${detalle.unidad_medida}</td>
                        <td>${detalle.factor_um}</td>
                        <td>${detalle.cantidad_entregada.toFixed(2) || 0}</td>
                        <td>$${detalle.importe_entregado.toFixed(2) || 0}</td>
                        <td>$${detalle.iva_entregado.toFixed(2) || 0}</td>
                        <td>$${detalle.total_entregado.toFixed(2) || 0}</td>
                        <td>${detalle.observacion || ''}</td>
                    </tr>
                `;
            });
    
            // Parte 4: Información del personal
            if(movimiento.solo_domicilio == 1){
                document.getElementById('surtidor-info').textContent = movimiento.surtidor
                    ? `${movimiento.surtidor.clave_empleado} - ${movimiento.surtidor.nombre} ${movimiento.surtidor.apellido_paterno} ${movimiento.surtidor.apellido_materno}`
                    : 'N/A';
                document.getElementById('panel-info').textContent = movimiento.panel
                    ? `${movimiento.panel.clave_empleado} - ${movimiento.panel.nombre} ${movimiento.panel.apellido_paterno} ${movimiento.panel.apellido_materno}`
                    : 'N/A';
                document.getElementById('repartidor-info').textContent = movimiento.repartidor
                    ? `${movimiento.repartidor.clave_empleado} - ${movimiento.repartidor.nombre} ${movimiento.repartidor.apellido_paterno} ${movimiento.repartidor.apellido_materno}`
                    : 'N/A';
                document.getElementById('comienzo-surtido').textContent = fechaSurtido;
                document.getElementById('entrega-surtido').textContent = fechaEntrega;
                document.getElementById('panel-repartidor').textContent = fechaEntregaRepartidor;
                document.getElementById('entrega-repartidor').textContent = fechaEntregaRepartidorFin;
                document.getElementById('cosas-remision').style.display = 'block';
                document.getElementById('cosas-remision2').style.display = 'block';
            }else{
                document.getElementById('surtidor-info').textContent = movimiento.surtidor
                    ? `${movimiento.surtidor.clave_empleado} - ${movimiento.surtidor.nombre} ${movimiento.surtidor.apellido_paterno} ${movimiento.surtidor.apellido_materno}`
                    : 'N/A';
                document.getElementById('comienzo-surtido').textContent = fechaSurtido;
                document.getElementById('entrega-surtido').textContent = fechaEntrega;
                document.getElementById('cosas-remision').style.display = 'none';
                document.getElementById('cosas-remision2').style.display = 'none';
            }
    
            // Mostrar el modal
            $('#movimientoModal').modal('show');
        } catch (error) {
            console.error('Error al mostrar el modal del movimiento:', error);
        }
    }

    $('#movimientoModal').on('show.bs.modal', async function(event) {
            const html = document.querySelector('html');
            html.classList.remove('perfect-scrollbar-on');
    });

    $('#movimientoModal').on('hidden.bs.modal', function () {
        // Limpiar el modal al cerrarlo
        document.getElementById('empleado-info').textContent = '';
        document.getElementById('fecha-movimiento').textContent = '';
        document.getElementById('condicion2').textContent = '';
        document.getElementById('almacen2').textContent = '';
        document.getElementById('folio').textContent = '';
        document.getElementById('folio-pedido').textContent = '';
        document.getElementById('folio-pedido-div').style.display = 'none';
        document.getElementById('cliente').textContent = '';
        document.getElementById('sucursal').textContent = '';
        document.getElementById('pagado').textContent = '';
        document.getElementById('metodo-pago').textContent = '';
        document.getElementById('cantidad-pedida').textContent = '';
        document.getElementById('importe-pedido').textContent = '';
        document.getElementById('iva-pedido').textContent = '';
        document.getElementById('descuento-pedido').textContent = '';
        document.getElementById('total-pedido').textContent = '';
        document.getElementById('utilidad').textContent = '';
        document.getElementById('moneda2').textContent = '';
        document.getElementById('tipo_movimiento').textContent = '';
        document.getElementById('cancelado').textContent = '';
        document.getElementById('facturado').textContent = '';
        document.getElementById('devolucion').textContent = '';
        document.getElementById('solo-domicilio').textContent = '';
        document.getElementById('cod2').textContent = '';
        document.getElementById('surtidor-info').textContent = '';
        document.getElementById('panel-info').textContent = '';
        document.getElementById('repartidor-info').textContent = '';
        document.getElementById('pedido-detalles').innerHTML = '';
        document.getElementById('entrega-detalles').innerHTML = '';
        const html = document.querySelector('html');
        html.classList.add('perfect-scrollbar-on');
    });

    // Fetch initial data
    fetchAndRenderMovimientos();
    // Llenar los selects al cargar la página
    await populateAlmacenes();
    await populateVendedores();
    await populateSurtidores();
    await populateMonedas();
});