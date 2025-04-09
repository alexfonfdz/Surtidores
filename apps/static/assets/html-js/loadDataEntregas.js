document.addEventListener('DOMContentLoaded', function () {
    const saveSurtirButton = document.getElementById('SurtirModalSave');
    const saveEntregarIncompletoButton = document.getElementById('EntregarModalSaveIncompleto');
    const saveEntregarCompletoButton = document.getElementById('EntregarModalSaveCompleto');
    const saveEntregarButton = document.getElementById('EntregarModalSave');
    const cancelarEntregaButton = document.getElementById('cancelar-entrega');
    const entregarModalTableBody = document.getElementById('EntregarModalTableBody');
    const entregarModalTable = document.getElementById('EntregarModalTable');
    const ventaDetalleTableBody = document.getElementById('movimiento-detalle-table-body');
    const codigoBusqueda = document.getElementById('codigo-busqueda');

    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    let currentPage = 1;
    let totalPages = 1; // Variable para almacenar el número total de páginas.

    prevPageButton.addEventListener('click', function() {
        if (currentPage > 1) {
            getMovimientosPendientes(currentPage - 1);
            currentPage--;
            document.getElementById('codigoMovimiento').value = ''; // Limpiar el campo de búsqueda al cambiar de página
            document.getElementById('codigoMovimiento').focus(); // Volver a enfocar el campo de búsqueda
        }
    });

    nextPageButton.addEventListener('click', function() {
        if (currentPage < totalPages) {
            getMovimientosPendientes(currentPage + 1);
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
            getMovimientosPendientes();
        });
    
        select.addEventListener('blur', function () {
            wrapper.classList.remove('open');
        });
    });

    document.getElementById('codigoMovimiento').addEventListener('keydown', async function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); 
            const data = await getMovimientosPendientes();

            if(data.length > 1 && event.target.value !== ''){
                showMessage('Se encontraron múltiples resultados. Por favor, verifique que exista solo un registro con ese folio.', 'error');
            } else if (data && event.target.value !== '') {
                const movimientoId = data[0][0];
                const movimientoFolio = data[0][1];
                const movimientoSurtiendo = data[0][2];
                const movimientoRol = data[0][3];
                const html = document.querySelector('html');
                
                if(!movimientoSurtiendo) {
                    document.getElementById('SurtirModal_movimientoId').value = movimientoId;
                    document.getElementById('SurtirModalFolio').textContent = '(Folio: '+movimientoFolio+')';
                    html.classList.remove('perfect-scrollbar-on');
                    saveSurtirButton.style.display = 'block';
                    $('#SurtirModal').modal('show');
                }else {
                    document.getElementById('EntregarModal_movimientoId').value = movimientoId;
                    document.getElementById('EntregarModal_codigoRol').value = movimientoRol;
                    document.getElementById('EntregarModalFolio').textContent = '(Folio: '+movimientoFolio+')';
                    html.classList.remove('perfect-scrollbar-on');
                    saveEntregarIncompletoButton.style.display = 'block';
                    saveEntregarCompletoButton.style.display = 'block';
                    saveEntregarButton.style.display = 'none';
                    entregarModalTable.style.display = 'none';
                    
                    $('#EntregarModal').modal('show');
                }
                

            } else if(event.target.value === '') {
                showMessage('No se ingresó folio.', 'info');

            } else {
                showMessage('No se encontró el pedido/remisión.', 'error');
                throw new Error('No se encontró la venta');
            }

        }
    });

    async function getMovimientosPendientes(page = currentPage) {
        const filterStatus = document.getElementById('filterStatus').value;
        const filterMovimiento = document.getElementById('filterMovimiento').value;
        const filterEntrega = document.getElementById('filterEntrega').value;
    
        const params = {
            codigo_movimiento: document.getElementById('codigoMovimiento').value,
            status: filterStatus === 'Todos' ? '' : filterStatus,
            tipo_movimiento: filterMovimiento === 'Todos' ? '' : filterMovimiento,
            solo_domicilio: filterEntrega === 'Entrega a Domicilio' ? 'true' : filterEntrega === 'Entrega en Piso' ? 'false' : '',
            page: page,
            page_size: 10,
            order_by: 'fecha_movimiento',
            order_dir: 'desc'
        };
    
        try {
            const data = await fetchMovimientosPendientes(params);
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
                    <td>$${movimiento.total_pedido || '0.00'}</td>
                    <td>${tipoEntrega}</td>
                    <td><button class="btn btn-primary btn-sm ver_modal" data-toggle="modal" data-target="#ventaModal" data-movimiento-id="${movimiento.id}">Ver</button></td>
                    <td><button class="btn btn-success btn-sm" data-toggle="modal" data-target="#EntregarModal" data-movimiento-id="${movimiento.id}" data-movimiento-folio="${movimiento.folio}" data-codigo-surtidor="${movimiento.codigo_surtidor}">Entregar</button></td>
                `;
                tableBody.appendChild(row);
            });

            pageInfo.textContent = `Página ${data.current_page} de ${data.num_pages}`;
            prevPageButton.disabled = !data.has_previous;
            nextPageButton.disabled = !data.has_next;
            totalPages = data.num_pages;
            currentPage = data.current_page;
            document.getElementById('codigo-busqueda').hidden = true;

            return data.results.map(movimiento => [movimiento.id, movimiento.folio, movimiento.fecha_surtiendo, movimiento.codigo_surtidor]);
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
        if(movimiento.empleado){
            document.getElementById('modal-vendedor').value = `${movimiento.empleado.nombre} ${movimiento.empleado.apellido_paterno} ${movimiento.empleado.apellido_materno}` || '';
            document.getElementById('modal-vendedor').title = `${movimiento.empleado.nombre} ${movimiento.empleado.apellido_paterno} ${movimiento.empleado.apellido_materno}` || '';
        } else {
            document.getElementById('modal-vendedor').value = '';
        }
        const noDetalles = document.getElementsByClassName('no-detalles');
        const detalles = await fetchMovimientoDetalle(movimientoId);
        if (detalles.length == 0) {
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
    
    saveSurtirButton.addEventListener('click', async function() {
        try {
            const movimientoId = document.getElementById('SurtirModal_movimientoId').value;
            const CodigoSurtidor = document.getElementById('SurtirModal_codigoSurtidor').value;
            if(CodigoSurtidor == '' || CodigoSurtidor == null || CodigoSurtidor == undefined || !CodigoSurtidor ) {
                showMessage('Proporcione el código de surtidor.', 'error');
                throw new Error('Surtidor no seleccionado');
            }
            
            const result = await updateProcesoSurtir(movimientoId, CodigoSurtidor);
            if (result.error) {
                showMessage(result.error, 'error');
                throw new Error(result.error);
            }

            if (result.message) {
                showMessage('Venta surtida correctamente.', 'success');
            } else {
                showMessage('Error al surtir la venta.', 'error');
                throw new Error('Error al surtir la venta.');
            }

            $('#SurtirModal').modal('hide');
            showMessage('Venta empezando a surtirse.', 'success');
            getMovimientosPendientes();
            
        } catch (error) {
            showMessage(error, 'error');
            throw new Error(error);
        }
    });

    saveEntregarCompletoButton.addEventListener('click', async function() {
        try{
        const movimientoId = document.getElementById('EntregarModal_movimientoId').value;
        const codigo_rol = document.getElementById('EntregarModal_codigoRol').value;
        const CodigoSurtidor = document.getElementById('EntregarModal_codigoSurtidor').value;
        if(CodigoSurtidor == '' || CodigoSurtidor == null || CodigoSurtidor == undefined || !CodigoSurtidor ) {
            showMessage('Proporcione el código de surtidor.', 'error');
            throw new Error('Surtidor no seleccionado');
        }

        const empleado = await fetchEmpleadoByCodigoSurtidor(CodigoSurtidor);
        if(!empleado) {
            showMessage('Surtidor no existente.', 'error');
            throw new Error('Surtidor no existente');
        }
        if(empleado.rol_id !== 2) {
            showMessage('El código no es de surtidor.', 'error');
            throw new Error('El código de surtidor no es válido.');
        }

        document.getElementById('codigo-busqueda').hidden = false;

        // Cargar detalles de la venta en la tabla
        const detalles = await fetchMovimientoDetalle(movimientoId);
        entregarModalTableBody.innerHTML = '';
        if (detalles.length === 0) {
            entregarModalTableBody.innerHTML = '<tr class="no-detalles"><td colspan="5" class="text-center">No se encuentran productos en esta venta</td></tr>';
        } else {
            detalles.forEach(detalle => {
                const row = document.createElement('tr');
                row.setAttribute('data-id', detalle.id);
                row.innerHTML = `
                    <td>${detalle.codigo_producto}</td>
                    <td>${detalle.producto}</td>
                    <td>${detalle.cantidad_pedida}</td>
                    <td><input type="number" class="form-control" max="${detalle.cantidad_pedida}" value="${detalle.cantidad_pedida}" readonly></td>
                    <td><input type="text" class="form-control" value="${detalle.observacion || ''}"></td>
                `;
                entregarModalTableBody.appendChild(row);
            });
        }

        // Mostrar la tabla y cambiar los botones
        entregarModalTable.style.display = 'block';
        saveEntregarIncompletoButton.style.display = 'none';
        saveEntregarCompletoButton.style.display = 'none';
        saveEntregarButton.style.display = 'block';
        codigoBusqueda.value = '';
        codigoBusqueda.style.display = 'block';
        document.getElementById('EntregarModal_codigoSurtidor').readOnly = true;
        }catch (error) {
            showMessage(error, 'error');
            throw new Error(error);
        }
    });

    saveEntregarIncompletoButton.addEventListener('click', async function() {
        try{
            const movimientoId = document.getElementById('EntregarModal_movimientoId').value;
            const codigo_rol = document.getElementById('EntregarModal_codigoRol').value;
            const CodigoSurtidor = document.getElementById('EntregarModal_codigoSurtidor').value;
            if(CodigoSurtidor == '' || CodigoSurtidor == null || CodigoSurtidor == undefined || !CodigoSurtidor ) {
                showMessage('Proporcione el código de surtidor.', 'error');
                throw new Error('Surtidor no seleccionado');
            }

            const empleado = await fetchEmpleadoByCodigoSurtidor(CodigoSurtidor);
            
            if(!empleado) {
                showMessage('Surtidor no existente.', 'error');
                throw new Error('Surtidor no existente');
            }
            if(empleado.rol_id !== 2) {
                showMessage('El código no es de surtidor.', 'error');
                throw new Error('El código de surtidor no es válido.');
            }

            document.getElementById('codigo-busqueda').hidden = false;

            // Cargar detalles de la venta en la tabla
            const detalles = await fetchMovimientoDetalle(movimientoId);
            entregarModalTableBody.innerHTML = '';
            if (detalles.length === 0) {
                entregarModalTableBody.innerHTML = '<tr class="no-detalles"><td colspan="5" class="text-center">No se encuentran productos en esta venta</td></tr>';
            } else {
                detalles.forEach(detalle => {
                    const row = document.createElement('tr');
                    row.setAttribute('data-id', detalle.id);
                    row.innerHTML = `
                        <td>${detalle.codigo_producto}</td>
                        <td>${detalle.producto}</td>
                        <td>${detalle.cantidad_pedida}</td>
                        <td><input type="number" class="form-control" max="${detalle.cantidad_pedida}" value="${detalle.cantidad_entregada || 0}"></td>
                        <td><input type="text" class="form-control" value="${detalle.observacion || ''}"></td>
                    `;
                    entregarModalTableBody.appendChild(row);
                });
            }

            // Mostrar la tabla y cambiar los botones
            entregarModalTable.style.display = 'block';
            saveEntregarIncompletoButton.style.display = 'none';
            saveEntregarCompletoButton.style.display = 'none';
            saveEntregarButton.style.display = 'block';
            codigoBusqueda.value = '';
            codigoBusqueda.style.display = 'block';
            document.getElementById('EntregarModal_codigoSurtidor').readOnly = true;
        }catch (error) {
            showMessage(error, 'error');
            throw new Error(error);
        }
    });

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


    saveEntregarButton.addEventListener('click', async function() {
        try {
            const movimientoId = document.getElementById('EntregarModal_movimientoId').value;
            const codigo_rol = document.getElementById('EntregarModal_codigoRol').value;
            const codigoSurtidor = document.getElementById('EntregarModal_codigoSurtidor').value;
            const surtidorId = await fetchEmpleadoByCodigoSurtidor(codigoSurtidor);
            const idSurtidor = surtidorId ? surtidorId.id : null;
            const detalles = Array.from(entregarModalTableBody.querySelectorAll('tr')).map(row => {
                const cantidadEntregada = row.querySelector('input[type="number"]').value;
                const observaciones = row.querySelector('input[type="text"]').value;

                if (idSurtidor === null) {
                    showMessage('Surtidor no existente.', 'error');
                    throw new Error('Surtidor no existente');
                }

                if (cantidadEntregada < 0 || cantidadEntregada == '' || cantidadEntregada == null || cantidadEntregada == undefined) {
                    showMessage('La cantidad surtida no puede ser menor a 0.', 'error');
                    throw new Error('Cantidad surtida inválida');
                }

                return {
                    id: row.dataset.id,
                    cantidad_entregada: cantidadEntregada,
                    observaciones: observaciones
                };
            });

            const result = await updateMovimientoDetalle(movimientoId, idSurtidor, detalles);
            showMessage('Detalle de venta actualizado correctamente.', 'success');


            // Resetear los campos de cantidad entregada a solo lectura
            saveEntregarButton.style.display = 'none';
            saveEntregarIncompletoButton.style.display = 'block';
            saveEntregarCompletoButton.style.display = 'block';
            entregarModalTable.style.display = 'none';
            entregarModalTableBody.innerHTML = '';
            codigoBusqueda.value = '';
            codigoBusqueda.style.display = 'none';
            document.getElementById('EntregarModal_codigoSurtidor').value = '';
            document.getElementById('EntregarModal_codigoSurtidor').readOnly = false;
            $('#EntregarModal').modal('hide');
            document.getElementById('codigoMovimiento').value = '';
            getMovimientosPendientes();
            // getSurtidoresdelDia();
        } catch (error) {
            if(error.message == 'Surtidor no seleccionado') {
                showMessage('Selecciona un surtidor.', 'error');
            }
            else if (error.message == 'Cantidad surtida inválida') {
                showMessage('La cantidad surtida no puede ser menor a 0.', 'error');
            }
            else {
                showMessage('Hubo un problema al guardar los cambios.', 'error');
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
            const codigoSurtidor = button.data('codigo-surtidor');
            const html = document.querySelector('html');
            document.getElementById('EntregarModal_movimientoId').value = movimientoId;
            document.getElementById('EntregarModal_codigoRol').value = codigoSurtidor;
            document.getElementById('EntregarModalFolio').textContent = '(Folio: '+movimientoFolio+')';
            html.classList.remove('perfect-scrollbar-on');
            saveEntregarIncompletoButton.style.display = 'block';
            saveEntregarCompletoButton.style.display = 'block';
            saveEntregarButton.style.display = 'none';
            entregarModalTable.style.display = 'none';
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
        document.getElementById('EntregarModal_codigoSurtidor').value = '';
        document.getElementById('EntregarModal_codigoSurtidor').readOnly = false;
        html.classList.add('perfect-scrollbar-on');
        entregarModalTableBody.innerHTML = '';
        saveEntregarIncompletoButton.style.display = 'block';
        saveEntregarCompletoButton.style.display = 'block';
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
    getMovimientosPendientes();
    // getSurtidoresdelDia();

    async function fetchAndGet() {
        await fetchActualizarMovimientosAdmintotal();
        getMovimientosPendientes();
    }
    setInterval(fetchAndGet, 60000); 

    document.getElementById('codigoMovimiento').focus();
    setTimeout(() => {
        document.getElementById('codigoMovimiento').focus();
    }, 0);
});
