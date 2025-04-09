document.addEventListener('DOMContentLoaded', function () {
    const saveEntregarIncompletoButton = document.getElementById('EntregarModalSaveIncompleto');
    const saveEntregarCompletoButton = document.getElementById('EntregarModalSaveCompleto');
    const saveEntregarButton = document.getElementById('EntregarModalSave');
    const cancelarEntregaButton = document.getElementById('cancelar-entrega');
    const entregarModalTableBody = document.getElementById('EntregarModalTableBody');
    const entregarModalTable = document.getElementById('EntregarModalTable');
    const ventaDetalleTableBody = document.getElementById('movimiento-detalle-table-body');
    const entregarDetalleTableBody = document.getElementById('entrega-detalle-table-body');
    const codigoBusqueda = document.getElementById('codigo-busqueda'); 
    
    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    let currentPage = 1;
    let totalPages = 1; // Variable para almacenar el número total de páginas.

    prevPageButton.addEventListener('click', function() {
        if (currentPage > 1) {
            getMovimientosEntregados(currentPage - 1);
            currentPage--;
            document.getElementById('codigoMovimiento').value = ''; // Limpiar el campo de búsqueda al cambiar de página
            document.getElementById('codigoMovimiento').focus(); // Volver a enfocar el campo de búsqueda
        }
    });

    nextPageButton.addEventListener('click', function() {
        if (currentPage < totalPages) {
            getMovimientosEntregados(currentPage + 1);
            currentPage++;
            document.getElementById('codigoMovimiento').value = ''; // Limpiar el campo de búsqueda al cambiar de página
            document.getElementById('codigoMovimiento').focus(); // Volver a enfocar el campo de búsqueda
        }
    });

    document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
        const select = wrapper.querySelector('select');
    
        select.addEventListener('click', function () {
            wrapper.classList.toggle('open');
        });
    
        select.addEventListener('change', function () {
            getMovimientosEntregados();
        });
    
        select.addEventListener('blur', function () {
            wrapper.classList.remove('open');
        });
    });

    document.getElementById('codigoMovimiento').addEventListener('keydown', async function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const data = await getMovimientosEntregados();

            if(event.target.value === '') {
                // Caso en el que no se ingresó un folio
                showMessage('No se ingresó folio.', 'info');
                return;
            }
    
            if (!data || data.length === 0) {
                // Caso en el que no se encontraron resultados
                showMessage('No se encontró el pedido/remisión.', 'error');
                return;
            }
    
            if (data.length > 1 && event.target.value !== '') {
                // Caso en el que hay múltiples resultados
                showMessage('Se encontraron múltiples resultados. Por favor, verifique que exista solo un registro con ese folio.', 'error');
            } else if (data.length === 1 && event.target.value !== '') {
                // Caso en el que hay un único resultado
                const movimientoId = data[0][0];
                const movimientoFolio = data[0][1];
    
                document.getElementById('codigo-busqueda').style.display = 'none';
                document.getElementById('EntregarModal_movimientoId').value = movimientoId;
                document.getElementById('EntregarModalFolio').textContent = '(Folio: ' + movimientoFolio + ')';
                document.querySelector('html').classList.remove('perfect-scrollbar-on');
                saveEntregarButton.style.display = 'none';
                entregarModalTable.style.display = 'block';
                document.getElementById('codigo-busqueda').value = '';
                document.getElementById('codigo-busqueda').style.display = 'none';
                $('#EntregarModal').modal('show');
            } else if (event.target.value === '') {
                // Caso en el que no se ingresó un folio
                showMessage('No se ingresó folio.', 'info');
            }
        }
    });

    async function getMovimientosEntregados(page = currentPage) {
        const filterStatus = document.getElementById('filterStatus').value;
        const filterMovimiento = document.getElementById('filterMovimiento').value;
    
        const params = {
            codigo_movimiento: document.getElementById('codigoMovimiento').value,
            status: filterStatus === 'Todos' ? '' : filterStatus,
            tipo_movimiento: filterMovimiento === 'Todos' ? '' : filterMovimiento,
            page: page,
            page_size: 10,
            order_by: 'fecha_movimiento',
            order_dir: 'desc'
        };
    
        try {
            const data = await fetchMovimientosEntregados(params);
            const tableBody = document.getElementById('tableMovimientosPendientes');
            if(data.results.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No se encontraron resultados</td></tr>';
                return;
            }
            tableBody.innerHTML = '';
    
            data.results.forEach(movimiento => {
                const row = document.createElement('tr');

                const tipoEntrega = movimiento.solo_domicilio ? 'Entrega a Domicilio' : 'Entrega en Piso';
    
                row.innerHTML = `
                    <td>${new Date(movimiento.fecha_movimiento).toLocaleString('es-ES')}</td>
                    <td>${movimiento.tipo_movimiento || ''}</td>
                    <td>${movimiento.folio || ''}</td>
                    <td>${movimiento.status || ''}</td>
                    <td>${movimiento.cantidad_pedida || '0'}</td>
                    <td>${movimiento.cantidad_entregada || '0.00'}</td>
                    <td>$${movimiento.total_pedido || '0.00'}</td>
                    <td>${tipoEntrega}</td>
                    <td><button class="btn btn-primary btn-sm ver_modal" data-toggle="modal" data-target="#ventaModal" data-movimiento-id="${movimiento.id}">Ver</button></td>
                    <td>
                        <button class="btn btn-warning btn-sm" data-toggle="modal" data-target="#EntregarModal" data-movimiento-id="${movimiento.id}" data-movimiento-folio="${movimiento.folio}">Asignar Repartidor</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            pageInfo.textContent = `Página ${data.current_page} de ${data.num_pages}`;
            prevPageButton.disabled = !data.has_previous;
            nextPageButton.disabled = !data.has_next;
            totalPages = data.num_pages;
            currentPage = data.current_page;
            document.getElementById('codigo-busqueda').hidden = true;

            return data.results.map(movimiento => [movimiento.id, movimiento.folio]);
        } catch (error) {
            console.error('Error fetching movimientos pendientes:', error);
        }

    }
        
    // async function getSurtidoresdelDia() {
    //     const data = await fetchSurtidoresDelDia();

    //     divSurtidores.innerHTML = '';

    //     if (data.results.length !== 0) {
    //         data.results.forEach(surtidor => {
    //             const card = document.createElement('div');
    //             card.className = 'col-md-3 card-surtidor';
    //             const fotoSurtidor = surtidor.empleado_imagen ? 'https://storage.googleapis.com/at_private_storage/' + surtidor.empleado_imagen : '/static/assets/img/faces/default.png';

    //             card.innerHTML = `
    //                <div class="card-title">
    //                     <h5 class='truncate' title='${surtidor.nombre} ${surtidor.apellido_paterno} ${surtidor.apellido_materno}'>
    //                         ${surtidor.nombre} ${surtidor.apellido_paterno} ${surtidor.apellido_materno}
    //                     </h5>
    //                 </div>
    //                 <div class="card-image">
    //                     <img src="${fotoSurtidor}" alt="Foto de ${surtidor.nombre}">
    //                 </div>
    //                 <div class="card-details">
    //                     <div class="info">
    //                         <p>Piezas: ${(surtidor.piezas || 0).toFixed(2)}</p>
    //                         <p>Surtidos: ${surtidor.surtidos}</p>
    //                     </div>
    //                </div>
    //             `;
    //             divSurtidores.appendChild(card);
    //         });
    //     }
    // }

     // Función para cargar los detalles de la venta en el modal
     async function loadMovimientoDetails(movimientoId) {
        const movimientoIdInput = document.getElementById('movimiento-id');
        if (movimientoIdInput) {
            movimientoIdInput.value = movimientoId;
        }
    
        const movimiento = await fetchMovimiento(movimientoId);
        if (movimiento.tipo_movimiento == 'Remisión') {
            document.getElementById('modal-tipo-movimiento').value = `${movimiento.tipo_movimiento}: #${movimiento.folio}` || '';
        } else {
            document.getElementById('modal-tipo-movimiento').value = `${movimiento.tipo_movimiento}: ${movimiento.folio}` || '';
        }
        // Formato de fecha y hora
        const [date, time] = movimiento.fecha_movimiento.split('T');
        const formattedTime = time.split('.')[0];
        const dateObj = new Date(movimiento.fecha_movimiento);
        const formattedDate = dateObj.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        document.getElementById('modal-fecha-movimiento').value = `${formattedDate} - ${formattedTime}` || '';
        if (movimiento.tipo_movimiento == 'Remisión') {
            document.getElementById('modal-folio').value = `#${movimiento.folio}` || '';
            document.getElementById('modal-folio').title = `#${movimiento.folio}` || '';
        } else {
            document.getElementById('modal-folio').value = movimiento.folio || '';
            document.getElementById('modal-folio').title = movimiento.folio || '';
        }
        const folioRemisioInput = document.getElementById('modal-folioRemision');
        const folioRemisionGroup = document.getElementById('folioRemision-group');
        if (movimiento.folio_remision && movimiento.tipo_movimiento == 'Remisión') {
            folioRemisioInput.style.visibility = 'visible';
            folioRemisionGroup.style.display = 'block';
            document.getElementById('modal-folioRemision').value = `${movimiento.folio_remision}` || '';
            document.getElementById('modal-folioRemision').title = `${movimiento.folio_remision}` || '';
        } else {
            folioRemisioInput.style.visibility = 'hidden';
            folioRemisionGroup.style.display = 'none';

        }
        document.getElementById('modal-almacen').value = movimiento.almacen || '';
        document.getElementById('modal-almacen').title = movimiento.almacen || '';
        document.getElementById('modal-cliente').value = movimiento.cliente || '';
        document.getElementById('modal-cliente').title = movimiento.cliente || '';
        document.getElementById('modal-cantidad-pedida').value = movimiento.cantidad_pedida || '';
        document.getElementById('modal-solo-domicilio').checked = movimiento.solo_domicilio ? true : false;
        document.getElementById('modal-surtidor').value = movimiento.surtidor ? `${movimiento.surtidor.nombre} ${movimiento.surtidor.apellido_paterno} ${movimiento.surtidor.apellido_materno}` : 'Sin surtidor';
        if(movimiento.empleado){
            document.getElementById('modal-vendedor').value = `${movimiento.empleado.nombre} ${movimiento.empleado.apellido_paterno} ${movimiento.empleado.apellido_materno}` || '';
            document.getElementById('modal-vendedor').title = `${movimiento.empleado.nombre} ${movimiento.empleado.apellido_paterno} ${movimiento.empleado.apellido_materno}` || '';
        } else {
            document.getElementById('modal-vendedor').value = '';
        }

        // Cargar detalles del movimiento
        const detalles = await fetchMovimientoDetalle(movimientoId);
        const ventaDetalleTableBody = document.getElementById('movimiento-detalle-table-body');
        const entregaDetalleTableBody = document.getElementById('entrega-detalle-table-body');
        const noDetalles = document.getElementsByClassName('no-detalles');
        const noEntregas = document.getElementsByClassName('no-entregas');

        // Llenar tabla de detalles del movimiento
        if (detalles.length === 0) {
            for (let i = 0; i < noDetalles.length; i++) {
                noDetalles[i].style.display = '';
            }
        } else {
            for (let i = 0; i < noDetalles.length; i++) {
                noDetalles[i].style.display = 'none';
            }
            ventaDetalleTableBody.innerHTML = detalles.map(detalle =>
                `<tr data-id="${detalle.id}">
                    <td class="truncate" title="${detalle.codigo_producto}">${detalle.codigo_producto}</td>
                    <td class="truncate" title="${detalle.producto}">${detalle.producto}</td>
                    <td class="truncate" title="${detalle.unidad_medida}">${detalle.unidad_medida}</td>
                    <td class="truncate" title="${detalle.factor_um}">${detalle.factor_um}</td>
                    <td class="truncate" title="${detalle.cantidad_pedida}">${detalle.cantidad_pedida}</td>
                    <td class="truncate">$${detalle.precio_unitario.toFixed(2)}</td>
                    <td class="truncate">$${detalle.importe_pedido.toFixed(2)}</td>
                    <td class="truncate">$${detalle.iva_pedido.toFixed(2)}</td>
                    <td class="truncate">$${detalle.descuento_pedido.toFixed(2)}</td>
                    <td class="truncate">$${detalle.total_pedido.toFixed(2)}</td>
                </tr>`
            ).join('');
        }

        // Llenar tabla de detalles de la entrega
        if (detalles.length === 0) {
            for (let i = 0; i < noEntregas.length; i++) {
                noEntregas[i].style.display = '';
            }
        } else {
            for (let i = 0; i < noEntregas.length; i++) {
                noEntregas[i].style.display = 'none';
            }
            entregaDetalleTableBody.innerHTML = detalles.map(detalle =>
                `<tr data-id="${detalle.id}">
                    <td class="truncate" title="${detalle.codigo_producto}">${detalle.codigo_producto}</td>
                    <td class="truncate" title="${detalle.producto}">${detalle.producto}</td>
                    <td class="truncate" title="${detalle.unidad_medida}">${detalle.unidad_medida}</td>
                    <td class="truncate" title="${detalle.factor_um}">${detalle.factor_um}</td>
                    <td class="truncate" title="${detalle.cantidad_entregada || 0}">${detalle.cantidad_entregada || 0}</td>
                    <td class="truncate">$${(detalle.importe_entregado || 0).toFixed(2)}</td>
                    <td class="truncate">$${(detalle.iva_entregado || 0).toFixed(2)}</td>
                    <td class="truncate">$${(detalle.total_entregado || 0).toFixed(2)}</td>
                    <td class="truncate" title="${detalle.observacion || ''}">${detalle.observacion || ''}</td>
                </tr>`
            ).join('');
        }
     }

     // Modal
    $('#ventaModal').on('show.bs.modal', async function(event) {
        const button = $(event.relatedTarget);
        const html = document.querySelector('html');
        html.classList.remove('perfect-scrollbar-on');
        const movimientoId = button.data('movimiento-id');
        await loadMovimientoDetails(movimientoId);
    });

    $('#ventaModal').on('hidden.bs.modal', function () {
        // Limpiar los campos del modal
        document.getElementById('venta-form').reset();
        document.getElementById('movimiento-detalle-table-body').innerHTML = '';
        const html = document.querySelector('html');
        html.classList.add('perfect-scrollbar-on');
        document.getElementById('codigoMovimiento').value = ''; // Limpiar el campo de búsqueda al cerrar el modal
        document.getElementById('codigoMovimiento').focus(); // Volver a enfocar el campo de búsqueda
        $('#ventaModal').modal('hide');
    });
    

    document.getElementById('EntregarModal_codigoPanel').addEventListener('keydown', async function (event) {
        if (event.key === 'Enter') { // Verifica si la tecla presionada es Enter
            event.preventDefault(); // Evita el comportamiento predeterminado del Enter
            const codigoPanel = this.value;
    
            try {
                if (codigoPanel === '') {
                    showMessage('No se ingresó código de panel.', 'info');
                    return;
                }
    
                // Validar el empleado con el rol de panel
                const empleado = await fetchEmpleadoByCodigoPanel(codigoPanel);
                if (!empleado) {
                    showMessage('Empleado no encontrado o no tiene el rol de panel.', 'error');
                    throw new Error('Empleado no encontrado o no tiene el rol de panel.');
                }
    
                // Bloquear el campo de código de panel
                this.readOnly = true;
    
                // Mostrar las tablas y el campo de selección de repartidor
                document.getElementById('entrega-details-group').style.display = 'block';
                document.getElementById('repartidor-select-group').style.display = 'block';
    
                // Cargar los repartidores en el select
                const repartidores = await fetchRepartidores();
                const repartidorSelect = document.getElementById('repartidor-select');
                if(repartidores.length === 0 || repartidores === null) {
                    repartidorSelect.innerHTML = '<option value="" disabled select>No hay repartidores disponibles</option>';
                }else { 
                    repartidorSelect.innerHTML = '<option value="" disabled select>Seleccionar Repartidor</option>';
                    repartidores.forEach(repartidor => {
                        repartidorSelect.innerHTML += `<option value="${repartidor.id}" data-repartidor-codigo="${repartidor.codigo_rol}" data-cp="${empleado.id}">${repartidor.nombre} ${repartidor.apellido_paterno} ${repartidor.apellido_materno}</option>`;
                    });
                }

                repartidorSelect.value = ''; // Limpiar el valor del select
    
                // Cargar los detalles de la entrega
                const movimientoId = document.getElementById('EntregarModal_movimientoId').value;
                const detalles = await fetchMovimientoDetalle(movimientoId);
                const entregaDetalleTableBody = document.getElementById('EntregarModalTableBody');
                saveEntregarButton.style.display = 'block';
                entregaDetalleTableBody.innerHTML = detalles.map(detalle => `
                    <tr>
                        <td>${detalle.codigo_producto}</td>
                        <td>${detalle.producto}</td>
                        <td>${detalle.cantidad_pedida}</td>
                        <td><input type="number" class="form-control" value="${detalle.cantidad_entregada || 0}" max="${detalle.cantidad_pedida}" min="0" readonly></td>
                        <td><input type="text" class="form-control" value="${detalle.observacion || ''}" readonly></td>
                    </tr>
                `).join('');
            } catch (error) {
                showMessage(error.message, 'error');
                document.getElementById('entrega-details-group').style.display = 'none';
                document.getElementById('repartidor-select-group').style.display = 'none';
            }
        }
    });
    
    document.getElementById('EntregarModalSave').addEventListener('click', async function () {
        const movimientoId = document.getElementById('EntregarModal_movimientoId').value;
        const repartidorId = document.getElementById('repartidor-select').value;
        const codigoPanel = document.getElementById('EntregarModal_codigoPanel').value;
        
        // Asegúrate de seleccionar la opción correcta usando 'option:checked' 
        const selectedOption = document.querySelector('#repartidor-select option:checked');
        let panelId = null;
        let codigoRepartidor = null; // Inicializa la variable

        if (selectedOption) {
            codigoRepartidor = selectedOption.dataset.repartidorCodigo; // Accede al data-repartidor-codigo
            panelId = selectedOption.dataset.cp; // Accede al data-cp
        }
    
        if(!codigoRepartidor) {
            showMessage('No se encontró el código del repartidor.', 'error');
            return;
        }

        if(!panelId) {
            showMessage('No se encontró el código del panel.', 'error');
            return;
        }

        if (!repartidorId) {
            showMessage('Debe seleccionar un repartidor.', 'info');
            return;
        }
    
        try {
            // Llamar al método de actualización
            const response = await updatePanelRepartidorMovimiento(
                movimientoId,
                repartidorId,
                panelId,
                codigoPanel,
                codigoRepartidor
            );    
            showMessage(response.message, 'success');
            resetEntregarModal(); // Limpiar el modal después de la actualización
            getMovimientosEntregados(); // Actualizar la lista de movimientos entregados
            $('#EntregarModal').modal('hide');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });
    
    document.getElementById('cancelar-entrega').addEventListener('click', function () {
        resetEntregarModal();
        $('#EntregarModal').modal('hide');
    });
    
    $('#EntregarModal').on('hidden.bs.modal', function () {
        resetEntregarModal();
    });
    
    // Función para limpiar el modal y restaurar los valores por defecto
    function resetEntregarModal() {
        document.getElementById('EntregarModalForm').reset();
        document.getElementById('EntregarModal_codigoPanel').readOnly = false;
        document.getElementById('repartidor-select-group').style.display = 'none';
        document.getElementById('entrega-details-group').style.display = 'none';
        document.getElementById('EntregarModalTableBody').innerHTML = '';
        getMovimientosEntregados(); // Actualizar la lista de movimientos entregados
    }

    // Agregar evento de búsqueda por código en ventaDetails
    document.getElementById('codigo-busqueda').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = entregarModalTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const codigo = row.querySelector('td:nth-child(1)').textContent.toLowerCase();
            if (codigo.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });

    // Agregar evento de búsqueda por código en venta
    document.getElementById('codigo-busqueda-movimiento').addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const rows = ventaDetalleTableBody.querySelectorAll('tr');
                rows.forEach(row => {
                    const codigo = row.querySelector('td:nth-child(1)').textContent.toLowerCase();
                    if (codigo.includes(searchTerm)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
                const rowsEntrega = entregarDetalleTableBody.querySelectorAll('tr');
                rowsEntrega.forEach(row => {
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


    cancelarEntregaButton.addEventListener('click', function() {
        if (saveEntregarButton.style.display === 'none') {
            $('#EntregarModal').modal('hide');
        } else {
            // Ocultar la tabla y resetear los botones
            entregarModalTable.style.display = 'none';
            saveEntregarIncompletoButton.style.display = 'block';
            saveEntregarCompletoButton.style.display = 'block';
            saveEntregarButton.style.display = 'none';
            codigoBusqueda.value = '';
            codigoBusqueda.style.display = 'none';
            document.getElementById('EntregarModal_codigoSurtidor').value = '';
            document.getElementById('EntregarModal_codigoSurtidor').readOnly = false;
        }
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

    // Cerrar modal con tecla Esc
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if ($('#EntregarModal').hasClass('show')) {
                $('#EntregarModal').modal('hide');
            }
        }
    });

    $('#EntregarModal').on('show.bs.modal', async function(event) {
        if (document.getElementById('EntregarModal_movimientoId').value === ''){
            const button = $(event.relatedTarget);
            const movimientoId = button.data('movimiento-id');
            const movimientoFolio = button.data('movimiento-folio');
            const html = document.querySelector('html');
            document.getElementById('EntregarModal_movimientoId').value = movimientoId;
            document.getElementById('EntregarModalFolio').textContent = '(Folio: '+movimientoFolio+')';
            html.classList.remove('perfect-scrollbar-on');
            saveEntregarButton.style.display = 'none';
            entregarModalTable.style.display = 'block';
            document.getElementById('codigo-busqueda').value = '';
            document.getElementById('codigo-busqueda').style.display = 'none';
        }
    });

    $('#EntregarModal').on('hidden.bs.modal', function () {
        const html = document.querySelector('html');
        document.getElementById('EntregarModalForm').reset();
        document.getElementById('EntregarModal_movimientoId').value = '';
        document.getElementById('EntregarModal_codigoRol').value = '';
        document.getElementById('EntregarModalFolio').textContent = '';
        html.classList.add('perfect-scrollbar-on');
        entregarModalTableBody.innerHTML = '';
        saveEntregarButton.style.display = 'none';
        entregarModalTable.style.display = 'none';
        document.getElementById('codigo-busqueda').value = '';
        document.getElementById('codigo-busqueda').style.display = 'none';
        $('#EntregarModal').modal('hide');
        document.getElementById('codigoMovimiento').focus();
    });

    $('#SurtirModal').on('show.bs.modal', async function(event) {
        const button = $(event.relatedTarget);
        if(button.data('movimiento-id') && button.data('movimiento-id')) {
            const movimientoId = button.data('movimiento-id');
            const movimientoFolio = button.data('movimiento-folio');
            document.getElementById('SurtirModal_movimientoId').value = movimientoId;
           document.getElementById('SurtirModalFolio').textContent =  `(Folio: ${movimientoFolio})`;
        }else{
        }
    });

    $('#SurtirModal').on('hidden.bs.modal', function () {
        document.getElementById('SurtirModalForm').reset();
        document.getElementById('SurtirModal_movimientoId').value = '';
        document.getElementById('SurtirModalFolio').textContent = '';
        document.getElementById('SurtirModal_codigoSurtidor').value = '';
        document.getElementById('SurtirModal_codigoSurtidor').readOnly = false;
        $('#SurtirModal').modal('hide');
        document.getElementById('codigoMovimiento').focus();
    });

    fetchAndGet();
    getMovimientosEntregados();
    // getSurtidoresdelDia();

    async function fetchAndGet() {
        await fetchActualizarMovimientosAdmintotal();
        getMovimientosEntregados();
    }
    setInterval(fetchAndGet, 60000); 

    document.getElementById('codigoMovimiento').focus();
    setTimeout(() => {
        document.getElementById('codigoMovimiento').focus();
    }, 0);
});
