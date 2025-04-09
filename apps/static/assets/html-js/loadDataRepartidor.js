document.addEventListener('DOMContentLoaded', function () {
    const loginModal = document.getElementById('loginModal');
    const logoutButton = document.getElementById('logoutButton');
    const loginButton = document.getElementById('loginButton');
    const repartidorCodigo = document.getElementById('repartidorCodigo');
    const mainContent = document.querySelector('.main-content'); // Contenedor principal
    const tableBody = document.getElementById('tableMovimientosPendientes');
    const movimientoTableBody = document.getElementById('movimiento-detalle-table-body');
    const entregaTableBody = document.getElementById('entrega-detalle-table-body');
    const pageInfo = document.getElementById('page-info');
    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const saveEntregarButton = document.getElementById('EntregarModalSave');
    const entregarModalTableBody = document.getElementById('EntregarModalTableBody');
    const entregarModalTable = document.getElementById('EntregarModalTable');

    let currentPage = 1;
    let totalPages = 1;

    // Ocultar todo excepto el modal de inicio de sesión al cargar la página
    mainContent.style.display = 'none';
    loginModal.style.display = 'flex';
    let porReloj = false;
    let intervalo = null;

    // Establecer el foco en el campo de entrada al cargar la página
     repartidorCodigo.focus();

    const reloj = document.getElementById('reloj');
    let tiempoRestante = 5 * 60; // 5 minutos en segundos

    // Manejar el evento "Enter" en el campo de entrada
    repartidorCodigo.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Evitar el comportamiento predeterminado del formulario
            loginButton.click(); // Simular un clic en el botón de iniciar sesión
        }
    });

    // Manejar el inicio de sesión
    loginButton.addEventListener('click', async function () {
        const codigo = repartidorCodigo.value.trim();
        porReloj = false;
        if (!codigo || codigo.length == '') {
            showToastMessage('Por favor, ingrese un código válido.', 'error');
            console.error('Código ingresado no válido:', codigo); // Agregar esta línea para depuración
            return;
        }
        try {
            const empleado = await fetchEmpleadoByCodigoRepartidor(codigo);
            if (!empleado) {
                showToastMessage('Código de repartidor no válido.', 'error');
                return;
            }

            showToastMessage('Inicio de sesión exitoso.', 'success');
            loginModal.style.display = 'none';
            mainContent.style.display = 'block';
            logoutButton.style.display = 'block';
            fetchAndGet();
            getMovimientosDomicilio(); // Cargar datos de la tabla

            setTimeout(() => {
                document.getElementById('codigoMovimiento').focus(); // Volver a enfocar el campo de búsqueda
            }, 500);
        
            async function fetchAndGet() {
                await fetchActualizarMovimientosAdmintotal();
                getMovimientosDomicilio();
            }
            setInterval(fetchAndGet, 60000); 

            reiniciarTemporizador(); // Reiniciar el temporizador al iniciar sesión
        
        } catch (error) {
            showToastMessage(error, 'error');
            console.error('Error fetching empleado:', error);
        }
    });

    // Manejar el cierre de sesión
    logoutButton.addEventListener('click', function () {
        if(porReloj) {
            showToastMessage('Sesión cerrada por inactividad.', 'info');
            mainContent.style.display = 'none';
            loginModal.style.display = 'flex';
            logoutButton.style.display = 'none';
            repartidorCodigo.value = '';
            repartidorCodigo.focus(); // Volver a enfocar el campo de entrada
            tableBody.innerHTML = ''; // Limpiar la tabla
            porReloj = false; // Reiniciar la variable porReloj
        } else {
            showToastMessage('Sesión cerrada.', 'info');
            detenerTemporizador(); // Detener el temporizador al cerrar sesión
            mainContent.style.display = 'none';
            loginModal.style.display = 'flex';
            logoutButton.style.display = 'none';
            repartidorCodigo.value = '';
            repartidorCodigo.focus(); // Volver a enfocar el campo de entrada
            tableBody.innerHTML = ''; // Limpiar la tabla
        }
    });

    // Función para actualizar el reloj
    function actualizarReloj() {
        const minutos = Math.floor(tiempoRestante / 60).toString().padStart(2, '0');
        const segundos = (tiempoRestante % 60).toString().padStart(2, '0');
        reloj.textContent = `Tiempo de sesión restante: ${minutos}:${segundos}`;

        if (tiempoRestante > 0) {
            tiempoRestante--;
        } else {
            detenerTemporizadorPorReloj(); // Detener el temporizador cuando llegue a 0
            reloj.textContent = "Tiempo de sesión restante: 00:00"; // Mostrar 00:00 al finalizar
            logoutButton.click(); // Cerrar sesión automáticamente
        }
    }

    // Función para reiniciar el temporizador
    function reiniciarTemporizador() {
        detenerTemporizador(); // Detener cualquier intervalo existente
        tiempoRestante = 5 * 60; // Reiniciar el tiempo a 5 minutos
        intervalo = setInterval(actualizarReloj, 1000); // Iniciar un nuevo intervalo
        actualizarReloj(); // Actualizar el reloj inmediatamente
    }

    // Función para detener el temporizador
    function detenerTemporizador() {
        if (intervalo) {
            clearInterval(intervalo); // Detener el intervalo
            intervalo = null; // Limpiar la referencia al intervalo
        }
    }

    function detenerTemporizadorPorReloj() {
        if (intervalo) {
            clearInterval(intervalo); // Detener el intervalo
            intervalo = null; // Limpiar la referencia al intervalo
            porReloj = true; // Indicar que el cierre de sesión fue por inactividad
        }
    }

    document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
        const select = wrapper.querySelector('select');
    
        select.addEventListener('click', function () {
            wrapper.classList.toggle('open');
        });
    
        select.addEventListener('change', function () {
            getMovimientosDomicilio();
        });
    
        select.addEventListener('blur', function () {
            wrapper.classList.remove('open');
        });
    });

    // Reemplazo de getMovimientosDomicilio por getMovimientosDomicilio
    async function getMovimientosDomicilio(page = currentPage) {
        const filterStatus = document.getElementById('filterStatus').value;
        const filterMovimiento = document.getElementById('filterMovimiento').value;

        const params = {
            codigo_movimiento: document.getElementById('codigoMovimiento').value,
            status: filterStatus === 'Todos' ? '' : filterStatus,
            tipo_movimiento: filterMovimiento === 'Todos' ? '' : filterMovimiento,
            codigo_repartidor: repartidorCodigo.value.trim(),
            page: page,
            page_size: 10,
            order_by: 'fecha_movimiento',
            order_dir: 'desc'
        };

        try {
            const data = await fetchMovimientosEntregadosDomicilio(params);
            if (data.results.length === 0) {
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
                    <td><button class="btn btn-primary btn-sm ver_modal" data-toggle="modal" data-target="#pedidoModal" data-movimiento-id="${movimiento.id}">Ver</button></td>
                    <td>
                        <button class="btn btn-warning btn-sm" data-toggle="modal" data-target="#EntregarModal" data-movimiento-id="${movimiento.id}" data-movimiento-folio="${movimiento.folio}">Finalizar Entrega</button>
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
            showToastMessage('Error al cargar los datos.', 'error');
            console.error('Error fetching movimientos domicilio:', error);
        }
    }

    // Paginación
    prevPageButton.addEventListener('click', function () {
        if (currentPage > 1) {
            getMovimientosDomicilio(currentPage - 1);
            currentPage--;
            document.getElementById('codigoMovimiento').value = ''; // Limpiar el campo de búsqueda al cambiar de página
            document.getElementById('codigoMovimiento').focus(); // Volver a enfocar el campo de búsqueda
        }
    });

    nextPageButton.addEventListener('click', function () {
        if (currentPage < totalPages) {
            getMovimientosDomicilio(currentPage + 1);
            currentPage++;
            document.getElementById('codigoMovimiento').value = ''; // Limpiar el campo de búsqueda al cambiar de página
            document.getElementById('codigoMovimiento').focus(); // Volver a enfocar el campo de búsqueda
        }
    });

    document.getElementById('codigoMovimiento').addEventListener('keydown', async function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const data = await getMovimientosDomicilio();

            if(event.target.value === '') {
                // Caso en el que no se ingresó un folio
                showToastMessage('No se ingresó folio.', 'info');
                return;
            }
    
            if (!data || data.length === 0) {
                // Caso en el que no se encontraron resultados
                showToastMessage('No se encontró el pedido/remisión.', 'error');
                return;
            }
    
            if (data.length > 1 && event.target.value !== '') {
                // Caso en el que hay múltiples resultados
                showToastMessage('Se encontraron múltiples resultados. Por favor, verifique que exista solo un registro con ese folio.', 'error');
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
                showToastMessage('No se ingresó folio.', 'info');
            }
        }
    });

    document.getElementById('EntregarModal_codigoRepartidor').addEventListener('keydown', async function (event) {
        if (event.key === 'Enter') { // Verifica si la tecla presionada es Enter
            event.preventDefault(); // Evita el comportamiento predeterminado del Enter
            const codigoRepartidorEntregar = this.value;
            const codigoRepartidorLogin = repartidorCodigo.value.trim();
    
            try {
                if (codigoRepartidorEntregar === '') {
                    showToastMessage('No se ingresó código de repartidor.', 'info');
                    return;
                }

                if (!codigoRepartidorLogin) {
                    showToastMessage('No se encuentra el código de repartidor en la sesión.', 'error');
                    return;
                }

                if(codigoRepartidorEntregar !== codigoRepartidorLogin) {
                    showToastMessage('El código de repartidor no es el mismo al de la sesión.', 'error');
                    return;
                }
    
                // Validar el empleado con el rol de repartidor
                const empleado = await fetchEmpleadoByCodigoRepartidor(codigoRepartidorEntregar);
                if (!empleado) {
                    showToastMessage('Empleado no encontrado o no tiene el rol de repartidor.', 'error');
                    throw new Error('Empleado no encontrado o no tiene el rol de repartidor.');
                }
    
                // Bloquear el campo de código de repartidor
                this.readOnly = true;
    
                // Mostrar las tablas y el campo de selección de repartidor
                document.getElementById('entrega-details-group').style.display = 'block';
    
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
                showToastMessage(error.message, 'error');
                document.getElementById('entrega-details-group').style.display = 'none';
            }
        }
    });

    document.getElementById('EntregarModalSave').addEventListener('click', async function () {
        const codigoRepartidorLogin = repartidorCodigo.value.trim();
        const movimientoId = document.getElementById('EntregarModal_movimientoId').value;
        const codigoRepartidorEntregar = document.getElementById('EntregarModal_codigoRepartidor').value;

        if (!codigoRepartidorLogin) {
            showToastMessage('No se encuentra el código de repartidor en la sesión.', 'error');
        }
    
        if(!codigoRepartidorEntregar) {
            showToastMessage('El código de repartidor no es el mismo al de la sesión.', 'error');
            return;
        }
    
        try {
            // Llamar al método de actualización
            const response = await updateMovimientoRepartido(
                movimientoId,
                codigoRepartidorEntregar
            );    
            showToastMessage(response.message, 'success');
            resetEntregarModal(); // Limpiar el modal después de la actualización
            getMovimientosDomicilio(); // Actualizar la lista de movimientos entregados
            $('#EntregarModal').modal('hide');
        } catch (error) {
            showToastMessage(error.message, 'error');
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
        document.getElementById('EntregarModal_codigoRepartidor').readOnly = false;
        document.getElementById('entrega-details-group').style.display = 'none';
        document.getElementById('EntregarModalTableBody').innerHTML = '';
        getMovimientosDomicilio(); // Actualizar la lista de movimientos entregados
    }

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
    $('#pedidoModal').on('show.bs.modal', async function(event) {
        const button = $(event.relatedTarget);
        const html = document.querySelector('html');
        html.classList.remove('perfect-scrollbar-on');
        const movimientoId = button.data('movimiento-id');
        await loadMovimientoDetails(movimientoId);
    });

    $('#pedidoModal').on('hidden.bs.modal', function () {
        // Limpiar los campos del modal
        document.getElementById('venta-form').reset();
        document.getElementById('movimiento-detalle-table-body').innerHTML = '';
        const html = document.querySelector('html');
        html.classList.add('perfect-scrollbar-on');
        document.getElementById('codigoMovimiento').value = ''; // Limpiar el campo de búsqueda al cerrar el modal
        setTimeout(() => {
            document.getElementById('codigoMovimiento').focus(); // Volver a enfocar el campo de búsqueda
        }, 500); // Esperar un poco para que el modal se cierre completamente antes de enfocar el campo
        
        $('#ventaModal').modal('hide');
    });

    // Agregar evento de búsqueda por código en venta
    document.getElementById('codigo-busqueda-movimiento').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = movimientoTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const codigo = row.querySelector('td:nth-child(1)').textContent.toLowerCase();
            if (codigo.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
        const rowsEntrega = entregaTableBody.querySelectorAll('tr');
        rowsEntrega.forEach(row => {
            const codigo = row.querySelector('td:nth-child(1)').textContent.toLowerCase();
            if (codigo.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
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

    $(".toast-close").click(function() {
        hideToastMessage();
    });
});