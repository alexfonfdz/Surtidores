let currentOrderBy = 'nombre';
let currentOrderDir = 'asc';

document.addEventListener('DOMContentLoaded', async function() {
    const filterForm = document.getElementById('filter-form');
    const surtidoresContainer = document.getElementById('surtidores-container');
    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    const updateListButton = document.getElementById('update-list');
    const noResultsRow = document.getElementById('no-results');
    const clearSearchButton = document.getElementById('clear-search');
    const surtidorModal = document.getElementById('surtidorModal');
    const surtidorInfo = document.getElementById('surtidor-info');
    const movimientosSurtidorTableBody = document.getElementById('movimientos-surtidor-table-body');
    const inputFecha = document.getElementById('rango_fecha');
    const movimientoDetalleTableBody = document.getElementById('movimiento-detalle-table-body');
    const yearSelect = document.getElementById('year');
    
    let currentPage = 1;
    let totalPages = 1;

    // Generar opciones de años desde 2024 hasta el año actual
    const currentYear = new Date().getFullYear();
    for (let year = 2024; year <= currentYear; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    // Inicializar Flatpickr en los campos de fecha
    if (inputFecha) {
        const datePicker = flatpickr(".flatpickr", {
            dateFormat: "d-m-Y",
            allowInput: false,
            clickOpens: false,
            wrap: true,
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
                // Deshabilitar el campo de año cuando se selecciona un rango de fechas
                if (selectedDates.length > 0) {
                    yearSelect.disabled = true;
                } else {
                    yearSelect.disabled = false;
                }
            }
        });

        // Función para abrir/cerrar el calendario con clic en el botón
        document.querySelector('[data-toggle]').addEventListener('click', function(event) {
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
        document.querySelector('[data-clear]').addEventListener('click', function(event) {
            event.preventDefault();  // Prevenir el comportamiento predeterminado del enlace
            datePicker.clear();
            inputFecha.value = '';
            inputFecha.classList.remove('active');
            yearSelect.disabled = false;  // Habilitar el campo de año cuando se limpia el rango de fechas
        });
    }

        // Deshabilitar el campo de rango de fechas cuando se selecciona un año
        yearSelect.addEventListener('change', function() {
            if (yearSelect.value) {
                inputFecha.disabled = true;
            } else {
                inputFecha.disabled = false;
            }
        });

    async function fetchAndRenderSurtidores(page = 1) {
        const search = document.getElementById('search').value;
        const rangoFecha = document.getElementById('rango_fecha').value;
        const activo = document.getElementById('activo').value;
        const surtidorSinClave = document.getElementById('surtidor_sin_clave').value;

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

        const filters = {
            search: search,
            desde: fechaInicioFormat || '',
            hasta: fechaFinFormat || '',
            year: yearSelect.value || '',
            activo: activo,
            surtidor_sin_clave: surtidorSinClave,
            page: page,
            page_size: 10,
            order_by: currentOrderBy,
            order_dir: currentOrderDir
        };

        const data = await fetchReporteSurtidores(filters);
        surtidoresContainer.innerHTML = '';
        if (data.results.length === 0) {
            surtidoresContainer.innerHTML = '<div class="col-md-12 text-center">No hay resultados</div>';
        } else {
            let surtidorCount = 0;
            let totalSurtidores = 0;
            let mayorSurtidor = 0;
            data.results.forEach(surtidor => {
                const card = document.createElement('div');
                card.className = 'col-md-3 card-surtidor';
                const fotoSurtidor = surtidor.empleado_imagen ? 'https://storage.googleapis.com/at_private_storage/' + surtidor.empleado_imagen : '/static/assets/img/faces/default.png';

                card.innerHTML = `
                    <div class="card-title">
                        <h5 class='truncate' title='${surtidor.nombre} ${surtidor.apellido_paterno} ${surtidor.apellido_materno}'>
                            ${surtidor.nombre} ${surtidor.apellido_paterno} ${surtidor.apellido_materno}
                        </h5>
                    </div>
                    <div class="card-image">
                        <img src="${fotoSurtidor}" alt="Foto de ${surtidor.nombre}">
                    </div>
                    <div class="card-details">
                        <div class="info">
                            <p>Piezas: ${(surtidor.piezas || 0).toFixed(2)}</p>
                            <p>Surtidos: ${surtidor.surtidos}</p>
                        </div>
                    </div>
                    <div class="overlay">Clic para más información</div>
                `;
                card.addEventListener('click', async function() {
                    await loadSurtidorDetails(surtidor.id);
                    $('#surtidorModal').modal('show');
                });
                surtidoresContainer.appendChild(card);
                if(surtidor.surtidos > 0){
                    surtidorCount += surtidor.surtidos
                    totalSurtidores += 1
                    if(surtidor.surtidos > mayorSurtidor){
                        mayorSurtidor = surtidor.surtidos
                    }
                }
            });
            //Surtidor mas surtido color verde, menos surtido color rojo, promedio color amarillo, si no tiene surtidos color gris
            let promedio = surtidorCount / totalSurtidores
            let cards = document.querySelectorAll('.card-surtidor')
            cards.forEach(card => {
                let info = card.querySelector('.info');
                let surtidos = parseInt(info.querySelector('p:nth-child(2)').textContent.split(' ')[1]);
                if (surtidos == mayorSurtidor) {
                    card.classList.add('green');
                    let icon = document.createElement('div');
                    icon.className = 'icon';
                    card.appendChild(icon);
                } else if (surtidos == 0) {
                    card.classList.add('grey');
                    let icon = document.createElement('div');
                    icon.className = 'icon';
                    card.appendChild(icon);
                } else if (surtidos < promedio) {
                    card.classList.add('red');
                    let icon = document.createElement('div');
                    icon.className = 'icon';
                    card.appendChild(icon);
                } else if (surtidos >= promedio) {
                    card.classList.add('yellow');
                    let icon = document.createElement('div');
                    icon.className = 'icon';
                    card.appendChild(icon);
                }
            });
        }



        pageInfo.textContent = `Página ${data.current_page} de ${data.num_pages}`;
        prevPageButton.disabled = !data.has_previous;
        nextPageButton.disabled = !data.has_next;
        totalPages = data.num_pages;
        currentPage = data.current_page;
    }

    async function loadSurtidorDetails(surtidorId) {
        const search = document.getElementById('search').value;
        const rangoFecha = document.getElementById('rango_fecha').value;
        const activo = document.getElementById('activo').value;
        const surtidorSinClave = document.getElementById('surtidor_sin_clave').value;

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

        const filters = {
            search: search,
            desde: fechaInicioFormat || '',
            hasta: fechaFinFormat || '',
            year: yearSelect.value || '',
            activo: activo,
            surtidor_sin_clave: surtidorSinClave,
            order_by: currentOrderBy,
            order_dir: currentOrderDir
        };
        const surtidor = await getEmpleado(surtidorId, filters);
        const fotoSurtidor = surtidor.foto_empleado ? 'https://storage.googleapis.com/at_private_storage/' + surtidor.foto_empleado : '/static/assets/img/faces/default.png';
        surtidorInfo.innerHTML = `
        <div class="row mt-3">
            <div class="col-md-4">
                <img src="${fotoSurtidor}" alt="Foto de ${surtidor.nombre}" class="img-fluid">
            </div>
            <div class="col-md-8">
                <p><strong>Nombre:</strong> ${surtidor.nombre} ${surtidor.apellido_paterno} ${surtidor.apellido_materno}</p>
                <p><strong>RFC:</strong> ${surtidor.rfc || 'N/A'}</p>          
                <p><strong>Activo:</strong> ${surtidor.activo ? 'Sí' : 'No'}</p>
                <p><strong>Clave Empleado:</strong> ${surtidor.clave_empleado || 'N/A'}</p>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-md-6">
                <p><strong>CURP:</strong> ${surtidor.curp || 'N/A'}</p>
                <p><strong>Fecha de Nacimiento:</strong> ${surtidor.fecha_nacimiento || 'N/A'}</p>
                <p><strong>Género:</strong> ${surtidor.fecha_ingreso || 'N/A'}</p>
            </div>
            <div class="col-md-6">
                <p><strong>Email:</strong> ${surtidor.email_adicional || 'N/A'}</p>
                <p><strong>Celular:</strong> ${surtidor.celular || 'N/A'}</p>
            </div>
        </div>
        `;

        const movimientos = await fetchMovimientosSurtidor({ surtidor_id: surtidorId });
        movimientosSurtidorTableBody.innerHTML = '';
        if (movimientos.length === 0) {
            movimientosSurtidorTableBody.innerHTML = '<tr class="no-movimientos"><td colspan="11" class="text-center">No se encuentran movimientos para este surtidor</td></tr>';
        } else {
            movimientos.forEach(movimiento => {
                const row = document.createElement('tr');

                let fecha_hora_format = '';
                if (movimiento.fecha_movimiento) {
                    const [date, time] = movimiento.fecha_movimiento.split('T');
                    const formattedTime = time.split('.')[0];
                    const dateObj = new Date(movimiento.fecha_movimiento);
                    const formattedDate = dateObj.toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    fecha_hora_format = `${formattedDate} <br>${formattedTime}`;
                }
                const folio = movimiento.folio_adicional ? movimiento.folio_adicional : movimiento.folio;

                let tiempo_entrega = '';
                let fecha_movimiento = movimiento.fecha_movimiento;
                let fecha_entrega = movimiento.fecha_entrega;
                if(fecha_entrega){
                    tiempo_entrega = Math.abs(new Date(fecha_entrega) - new Date(fecha_movimiento));
                    let dias = Math.floor(tiempo_entrega / (1000 * 60 * 60 * 24));
                    let horas = Math.floor((tiempo_entrega % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    let minutos = Math.floor((tiempo_entrega % (1000 * 60 * 60)) / (1000 * 60));
                    tiempo_entrega = `${dias}d ${horas}h ${minutos}m`;
                }else{
                    tiempo_entrega = 'N/A';
                }

                let fecha_hora_entrega_format = '';
                if (movimiento.fecha_entrega) {
                    const [date, time] = movimiento.fecha_entrega.split('T');
                    const formattedTime = time.split('.')[0];
                    const dateObj = new Date(movimiento.fecha_entrega);
                    const formattedDate = dateObj.toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    fecha_hora_entrega_format = `${formattedDate} <br>${formattedTime}`;
                }

                row.innerHTML = `
                    <td title='${fecha_hora_format}'>${fecha_hora_format || 'N/A'}</td>
                    <td title='${movimiento.condicion}'>${movimiento.condicion || 'N/A'}</td>
                    <td title='${movimiento.almacen}'>${movimiento.almacen || 'N/A'}</td>
                    <td>${folio || 'N/A'}</td>
                    <td title='${movimiento.cliente}'>${movimiento.cliente || 'N/A'}</td>
                    <td title='${movimiento.sucursal}'>${movimiento.sucursal || ''}</td>
                    <td>${(movimiento.cantidad_pedida || 0).toFixed(2)}</td>
                    <td>${(movimiento.cantidad_entregada || 0).toFixed(2)}</td>
                    <td>$${(movimiento.importe_entregado || 0).toFixed(2)}</td>
                    <td>$${(movimiento.iva_entregado || 0).toFixed(2)}</td>
                    <td>$${(movimiento.descuento_entregado || 0).toFixed(2)}</td>
                    <td>$${(movimiento.total_entregado || 0).toFixed(2)}</td>
                    <td title='${fecha_hora_entrega_format}'>${fecha_hora_entrega_format || 'N/A'}</td>
                    <td title='${tiempo_entrega}'>${tiempo_entrega}</td>
                `;
                row.addEventListener('click', async function() {
                    await loadMovimimientoDetails(movimiento.id);
                });
                movimientosSurtidorTableBody.appendChild(row);
            });
        }
    }

    async function loadMovimimientoDetails(movimientoId) {
        const movimiento = await fetchMovimientoDetalleSurtidor(movimientoId);
        movimientoDetalleTableBody.innerHTML = '';
        if (movimiento.length === 0) {
            movimientoDetalleTableBody.innerHTML = '<tr class="no-movimientos-detalle"><td colspan="10" class="text-center">No se encuentran detalles para esta movimiento</td></tr>';
        } else {
            movimiento.forEach(detalle => {
                const row = document.createElement('tr');
                let fecha_hora_format = '';
                const [date, time] = detalle.fecha_entrega.split('T');
                const formattedTime = time.split('.')[0];
                const dateObj = new Date(detalle.fecha_entrega);
                const formattedDate = dateObj.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                fecha_hora_format = `${formattedDate} <br>${formattedTime}`;

                row.innerHTML = `
                    <td title='${fecha_hora_format}'>${fecha_hora_format}</td>
                    <td title='${detalle.codigo_producto}'>${detalle.codigo_producto}</td>
                    <td title='${detalle.producto}'>${detalle.producto}</td>
                    <td title='${detalle.factor_um}'>${(detalle.factor_um || 0)}</td>
                    <td title='${detalle.cantidad_pedida}'>${(detalle.cantidad_pedida || 0).toFixed(2)}</td>
                    <td title='${detalle.cantidad_entregada}'>${(detalle.cantidad_entregada || 0).toFixed(2)}</td>
                    <td title='${detalle.unidad_medida}'>${detalle.unidad_medida}</td>
                    <td>$${(detalle.importe_entregado || 0).toFixed(2)}</td>
                    <td>$${(detalle.iva_entregado|| 0).toFixed(2)}</td>
                    <td>$${(detalle.descuento_entregado || 0).toFixed(2)}</td>
                    <td>$${(detalle.total_entregado || 0).toFixed(2)}</td>
                    <td title='${detalle.observacion}'>${detalle.observacion}</td>
                `;
                movimientoDetalleTableBody.appendChild(row);
            });
        }
    }

    // Agregar evento de búsqueda por código en movimientoDetails
    document.getElementById('codigo-busqueda').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = movimientoDetalleTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const codigo = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            if (codigo.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });


    document.getElementById('search').addEventListener('input', function() {
        fetchAndRenderSurtidores();
    });

    document.getElementById('activo').addEventListener('change', function() {
        fetchAndRenderSurtidores();
    });

    document.getElementById('surtidor_sin_clave').addEventListener('change', function() {
        fetchAndRenderSurtidores();
    });

    document.getElementById('rango_fecha').addEventListener('change', function() {
        fetchAndRenderSurtidores();
    });

    yearSelect.addEventListener('change', function() {
        fetchAndRenderSurtidores();
    });

    updateListButton.addEventListener('click', function() {
        fetchAndRenderSurtidores();
    });

    prevPageButton.addEventListener('click', function() {
        if (currentPage > 1) {
            fetchAndRenderSurtidores(currentPage - 1);
        }
    });

    nextPageButton.addEventListener('click', function() {
        if (currentPage < totalPages) {
            fetchAndRenderSurtidores(currentPage + 1);
        }
    });

    clearSearchButton.addEventListener('click', function() {
        document.getElementById('search').value = '';
        document.getElementById('activo').value = '';
        document.getElementById('surtidor_sin_clave').value = '';
        document.getElementById('rango_fecha').value = '';
        document.getElementById('year').value = '';
        yearSelect.disabled = false;
        inputFecha.disabled = false;
        fetchAndRenderSurtidores();
    });

    // Quitar el scroll del html mientras el modal esté abierto
    $('#surtidorModal').on('show.bs.modal', function () {
        const html = document.querySelector('html');
        html.classList.remove('perfect-scrollbar-on');
    });


    $('#surtidorModal').on('hidden.bs.modal', function () {
        const html = document.querySelector('html');
        html.classList.add('perfect-scrollbar-on');
        //Limpiar tablas y campos
        surtidorInfo.innerHTML = '';
        movimientosSurtidorTableBody.innerHTML = '';
        movimientoDetalleTableBody.innerHTML = '';
        movimientoDetalleTableBody.innerHTML = '<tr class="no-movimientos-detalle"><td colspan="10" class="text-center">Da clic en una movimiento para ver su detalle</td></tr>';
    }); 

    // Cargar los surtidores al cargar la página
    fetchAndRenderSurtidores();
});