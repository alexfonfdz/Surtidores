document.addEventListener("DOMContentLoaded", () => {
    // Constants
    const empleadosTableBody = document.getElementById("empleados-table-body");
    const prevPageButton = document.getElementById("prev-page");
    const nextPageButton = document.getElementById("next-page");
    const pageInfo = document.getElementById("page-info");
    const updateEmpleadosButton = document.getElementById("update-empleados");    
    const clearSearchButton = document.getElementById("clear-search");
    const saveChangesButton = document.getElementById("save-changes");
    const searchInput = document.getElementById("search");
    const claveEmpleadoInput = document.getElementById("clave_empleado");
    const codigoRolInput = document.getElementById("codigo_rol");

    // State
    let currentOrderBy = "nombre";
    let currentOrderDir = "asc";
    let currentPage = 1;
    let totalPages = 1;

    // Fetch and render empleados
    const fetchAndRenderEmpleados = async (page = 1) => {
        try {
            const filters = {
                search: searchInput.value,
                clave_empleado: claveEmpleadoInput.value,
                codigo_rol: codigoRolInput.value,
                rol: document.getElementById("rol").value,
                activo: document.getElementById("activo").value, // Agregar el filtro de estado
                page,
                page_size: 10,
                order_by: currentOrderBy,
                order_dir: currentOrderDir,
            };
    
            const data = await getEmpleados(filters);
            if (data) {
                renderEmpleadosTable(data);
                updatePagination(data);
            } else {
                showToastMessage("Error al cargar los empleados.", "error");
            }
        } catch (error) {
            showToastMessage("Ocurrió un error al obtener los empleados.", "error");
        }
    };

    // Render empleados table
    const renderEmpleadosTable = (data) => {
        empleadosTableBody.innerHTML = "";
        if (data.results.length === 0) {
            empleadosTableBody.innerHTML = `<tr><td colspan="8" class="text-center">No hay resultados</td></tr>`;
        } else {            
            data.results.forEach((empleado) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td class="truncate">${empleado.nombre}</td>
                    <td class="truncate">${empleado.apellido_paterno}</td>
                    <td class="truncate">${empleado.apellido_materno}</td>
                    <td class="truncate text-center">${empleado.clave_empleado}</td>
                    <td class="truncate">${empleado.rol || "Sin asignar"}</td>
                    <td class="truncate text-center">${empleado.codigo_rol || "N/D"}</td>
                    <td class="truncate text-center">${empleado.activo ? "Sí" : "No"}</td>
                    <td><button class="btn btn-primary btn-sm ver_modal" clave="${empleado.id}">Editar</button></td>
                `;
                empleadosTableBody.appendChild(row);
            });
        }
    };

    const showEmpleadoModal = async (id_empleado) => {
        try {
            const empleado = await getEmpleado(id_empleado);
    
            if (!empleado) return;
    
            // Asignar valores a los campos del modal
            document.getElementById('modal-nombre').value = empleado.nombre || '';
            document.getElementById('modal-apellido-paterno').value = empleado.apellido_paterno || '';
            document.getElementById('modal-apellido-materno').value = empleado.apellido_materno || '';
            document.getElementById('modal-clave-empleado').value = empleado.clave_empleado || '';
            document.getElementById('modal-curp').value = empleado.curp || '';
            document.getElementById('modal-rfc').value = empleado.rfc || '';
            document.getElementById('modal-email').value = empleado.email || '';
            document.getElementById('modal-celular').value = empleado.celular || '';
            document.getElementById('modal-codigo-rol').value = empleado.codigo_rol || '';
            document.getElementById('modal-activo').value = empleado.activo ? 'Sí' : 'No';
    
            if (empleado.fecha_nacimiento) {
                const [year, month, day] = empleado.fecha_nacimiento.split('-');
                const fecha_nacimiento = new Date(year, month - 1, day);
                document.getElementById('modal-fecha-nacimiento').value = fecha_nacimiento.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                });
            } else {
                document.getElementById('modal-fecha-nacimiento').value = '';
            }
    
            // Asignar la foto al modal
            const empleadoFoto = document.getElementById("empleado-foto");
            empleadoFoto.src = empleado.empleado_imagen ? `https://storage.googleapis.com/at_private_storage/${empleado.empleado_imagen}` : "/static/assets/img/faces/default.png";
    
            // Esperar a que los roles se carguen antes de asignar el valor
            await populateRoles();
            const rolesSelect = document.getElementById("modal-rol");
            const codigoRolInput = document.getElementById("modal-codigo-rol");
    
            rolesSelect.value = String(empleado.rol_id || "");
    
            // Asignar el valor original a los atributos data-original-value
            rolesSelect.setAttribute("data-original-value", empleado.rol_id || "");
            codigoRolInput.setAttribute("data-original-value", empleado.codigo_rol || "");
    
            // Si el rol es "Sin asignar", deshabilitar el campo de código de rol y asignar "N/D"
            if (!empleado.rol_id) {
                codigoRolInput.readOnly = true;
                codigoRolInput.value = "N/D";
            } else {
                codigoRolInput.readOnly = false;
            }
    
            // Mostrar el modal
            $('#empleadoModal').modal('show');
        } catch (error) {
            console.error("Error fetching empleado data:", error);
        }
    };

    // Update pagination controls
    const updatePagination = (data) => {
        pageInfo.textContent = `Página ${data.current_page} de ${data.num_pages}`;
        prevPageButton.disabled = !data.has_previous;
        nextPageButton.disabled = !data.has_next;
        totalPages = data.num_pages;
        currentPage = data.current_page;
    };
    
    // Save changes
    const saveChanges = async () => {
        const claveEmpleado = document.getElementById("modal-clave-empleado").value;
        const rol = document.getElementById("modal-rol").value; // Mantener como string para verificar si está vacío
        const codigo_rol = document.getElementById("modal-codigo-rol").value;
    
        // Obtener los valores originales cargados en el modal
        const originalRol = document.getElementById("modal-rol").getAttribute("data-original-value");
        const originalCodigoRol = document.getElementById("modal-codigo-rol").getAttribute("data-original-value");
    
        // Verificar si no se han modificado los campos
        if (rol === originalRol && codigo_rol === originalCodigoRol) {
            showToastMessage("No se ha modificado ningún campo.", "info");
            return; // Detener la ejecución y no cerrar el modal
        }
    
        try {
            // Si el rol es "Sin asignar", enviar `null` como rol y código de rol
            const rolId = rol ? parseInt(rol, 10) : null;
            const codigoRolValue = rol ? codigo_rol : null;
    
            const response = await updateEmpleado(claveEmpleado, rolId, codigoRolValue);
            if (response) {
                $("#empleadoModal").modal("hide");
                fetchAndRenderEmpleados(currentPage);
            }
        } catch (error) {
            showToastMessage("Ocurrió un error al guardar los cambios.", "error");
        }
    };

    // Populate roles filter
    const populateRolesFilter = async () => {
        try {
            const response = await getRoles();
            const roles = response.roles;
            const rolSelect = document.getElementById("rol");
    
            // Agregar opciones al select
            roles.forEach((rol) => {
                const option = document.createElement("option");
                option.value = rol.id;
                option.textContent = rol.nombre;
                rolSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error al cargar los roles:", error);
        }
    };

    // Populate roles in the modal
    const populateRoles = async () => {
        try {
            const response = await getRoles();
            const roles = response.roles;
            const rolesSelect = document.getElementById("modal-rol");
            const codigoRolInput = document.getElementById("modal-codigo-rol");
    
            rolesSelect.innerHTML = "";
    
            // Agrega una opción por defecto
            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "Sin asignar";
            rolesSelect.appendChild(defaultOption);
    
            // Itera sobre los roles y crea las opciones
            roles.forEach((rol) => {
                const option = document.createElement("option");
                option.value = String(rol.id);
                option.textContent = rol.nombre;
                rolesSelect.appendChild(option);
            });
    
            // Variable para rastrear el valor anterior del select
            let previousValue = ""; // Inicialmente "Sin asignar"
    
            // Evento para habilitar/deshabilitar el campo "modal-codigo-rol"
            rolesSelect.addEventListener("change", (event) => {
                const currentValue = event.target.value;
    
                if (currentValue) {
                    // Si se selecciona un rol válido
                    codigoRolInput.readOnly = false;                    
    
                    // Limpiar el campo solo si el valor anterior era "Sin asignar"
                    if (previousValue === "") {
                        codigoRolInput.value = ""; // Limpiar el contenido del input
                    }
                } else {
                    // Si no se selecciona un rol válido, deshabilitar el campo y asignar "N/D"
                    codigoRolInput.readOnly = true;
                    codigoRolInput.value = "N/D"; // Mostrar "N/D"
                }
    
                // Actualizar el valor anterior
                previousValue = currentValue;
            });
    
            // Actualizar `previousValue` al abrir el modal
            rolesSelect.addEventListener("focus", () => {
                previousValue = rolesSelect.value;                
            });
        } catch (error) {
            console.error("Error populating roles:", error);
        }
    };

    // Event listeners
    const addEventListeners = () => {
        searchInput.addEventListener("input", () => fetchAndRenderEmpleados());
        claveEmpleadoInput.addEventListener("input", () => fetchAndRenderEmpleados());
        codigoRolInput.addEventListener("input", () => fetchAndRenderEmpleados());
    
        // Evento para el filtro de roles
        document.getElementById("rol").addEventListener("change", () => fetchAndRenderEmpleados());

        // Evento para el filtro de estado
        document.getElementById("activo").addEventListener("change", () => fetchAndRenderEmpleados());
    
        updateEmpleadosButton.addEventListener("click", async () => {
            await updateEmpleados();
            fetchAndRenderEmpleados();
        });
    
        prevPageButton.addEventListener("click", () => {
            if (currentPage > 1) fetchAndRenderEmpleados(currentPage - 1);
        });
    
        nextPageButton.addEventListener("click", () => {
            if (currentPage < totalPages) fetchAndRenderEmpleados(currentPage + 1);
        });
    
        clearSearchButton.addEventListener("click", () => {
            searchInput.value = "";
            claveEmpleadoInput.value = "";
            codigoRolInput.value = "";
            document.getElementById("rol").value = ""; // Restablecer el filtro de roles
            document.getElementById("activo").value = ""; // Restablecer el filtro de estado
            fetchAndRenderEmpleados();
        });
    
        saveChangesButton.addEventListener("click", saveChanges);
    
        empleadosTableBody.addEventListener("click", (event) => {
            if (event.target.classList.contains("ver_modal")) {
                const idEmpleado = event.target.getAttribute("clave");
                showEmpleadoModal(idEmpleado);
            }
        });
    
        $("#empleadoModal").on("show.bs.modal", () => {
            document.getElementById("main-content").setAttribute("inert", "true");
            document.querySelector("html").classList.remove("perfect-scrollbar-on");
        });
    
        $("#empleadoModal").on("hidden.bs.modal", () => {
            document.getElementById("main-content").removeAttribute("inert");
            document.querySelector("html").classList.add("perfect-scrollbar-on");
        });
    };
    
    // Initialize
    const init = () => {
        addEventListeners();
        populateRolesFilter();
        fetchAndRenderEmpleados();
    };

    init();
});


/**
 * Muestra un mensaje de notificación.
 *
 * @param {string} message - Mensaje a mostrar.
 * @param {string} type - Tipo de mensaje ("success" o "error").
 */
function showToastMessage(message, type) {
    // Verificar si el contenedor de toasts existe
    let toastContainer = document.querySelector(".toast-container");
    if (!toastContainer) {
        // Crear el contenedor si no existe
        toastContainer = document.createElement("div");
        toastContainer.className = "toast-container";
        document.body.appendChild(toastContainer);
    }

    // Crear un nuevo toast
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <span>${type === "success" ? "Éxito" : type === "error" ? "Error" : "Información"}</span>
            <button type="button" class="toast-close">&times;</button>
        </div>
        <div class="toast-body">${message}</div>
    `;

    // Agregar funcionalidad para cerrar el toast
    toast.querySelector(".toast-close").addEventListener("click", () => {
        toast.remove();
    });

    // Agregar el toast al contenedor
    toastContainer.appendChild(toast);

    // Mostrar el toast y eliminarlo después de 4 segundos
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

/**
 * Oculta el mensaje de notificación.
 */
function hideToastMessage() {
    document.getElementById("toastMessage").style.display = "none";
}