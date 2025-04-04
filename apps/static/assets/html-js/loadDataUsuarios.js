/**
 * Muestra el modal con los detalles de un usuario específico.
 *
 * @param {number} usuarioId - ID del usuario a mostrar en el modal.
 */
async function showUsuarioModal(usuarioId) {
    try {
        const usuario = await getUsuario(usuarioId);

        setModalFields(usuario);
        $("#usuarioModal").modal("show");
    } catch (error) {
        console.error(error);
        showToastMessage("Error al obtener detalles del usuario.", "error");
    }
}

/**
 * Configura los campos del modal con los datos del usuario.
 *
 * @param {Object} usuario - Datos del usuario.
 */
function setModalFields(usuario) {
    const usernameInput = document.getElementById("modal-username");
    usernameInput.value = usuario.username;
    usernameInput.setAttribute("data-original-username", usuario.username);

    const passwordInput = document.getElementById("modal-password");
    passwordInput.value = "";
    passwordInput.setAttribute("data-original-password", ""); // Contraseña original vacía

    document.getElementById("save-changes").setAttribute("data-id", usuario.id);
}

/**
 * Evento que se ejecuta cuando el DOM está completamente cargado.
 * Configura los eventos y carga la lista inicial de usuarios.
 */
document.addEventListener("DOMContentLoaded", function () {
    initializeEventListeners();
    fetchUsuarios();
});

/**
 * Inicializa los eventos de la página.
 */
function initializeEventListeners() {
    const saveChangesButton = document.getElementById("save-changes");
    saveChangesButton.addEventListener("click", saveChanges);

    const passwordInput = document.getElementById("modal-password");
    const enablePasswordEdit = document.getElementById("enablePasswordEdit");
    const togglePasswordVisibility = document.getElementById("togglePasswordVisibility");

    // Evento para habilitar/deshabilitar el campo de contraseña
    enablePasswordEdit.addEventListener("change", () => {
        if (enablePasswordEdit.checked) {
            passwordInput.readOnly = false;
        } else {
            passwordInput.readOnly = true;
            passwordInput.value = "";
        }
    });

    // Evento para alternar la visibilidad del campo de contraseña
    togglePasswordVisibility.addEventListener("click", () => {
        togglePasswordFieldVisibility(passwordInput, togglePasswordVisibility);
    });

    $(".toast-close").click(hideToastMessage);

    $("#usuarioModal").on("show.bs.modal", () => {
        document.getElementById("main-content").setAttribute("inert", "true");
        document.querySelector("html").classList.remove("perfect-scrollbar-on");
    });

    $("#usuarioModal").on("hidden.bs.modal", () => {
        document.getElementById("main-content").removeAttribute("inert");
        document.querySelector("html").classList.add("perfect-scrollbar-on");
        resetModal();
    });
}


/**
 * Resetea el estado del modal, incluyendo el checkbox de "Editar contraseña"
 * y la visibilidad del campo de contraseña.
 */
function resetModal() {
    const enablePasswordEdit = document.getElementById("enablePasswordEdit");
    const passwordInput = document.getElementById("modal-password");
    const togglePasswordVisibility = document.getElementById("togglePasswordVisibility");

    // Resetear el checkbox de "Editar contraseña"
    enablePasswordEdit.checked = false;
    passwordInput.readOnly = true;

    // Resetear la visibilidad del campo de contraseña
    passwordInput.type = "password";
    togglePasswordVisibility.innerHTML = '<i class="fa fa-eye"></i>';
}


/**
 * Alterna la visibilidad del campo de contraseña.
 *
 * @param {HTMLElement} passwordInput - Campo de contraseña.
 * @param {HTMLElement} toggleButton - Botón de alternar visibilidad.
 */
function togglePasswordFieldVisibility(passwordInput, toggleButton) {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleButton.innerHTML = '<i class="fa fa-eye-slash"></i>';
    } else {
        passwordInput.type = "password";
        toggleButton.innerHTML = '<i class="fa fa-eye"></i>';
    }
}

/**
 * Obtiene y muestra la lista de usuarios en la tabla.
 */
async function fetchUsuarios() {
    const usuariosTableBody = document.getElementById("usuarios-table-body");
    const noResultsRow = document.getElementById("no-results");

    try {
        const data = await getUsuarios();

        usuariosTableBody.innerHTML = "";
        if (data.results.length === 0) {
            if (noResultsRow) {
                noResultsRow.style.display = "";
            }
        } else {
            if (noResultsRow) {
                noResultsRow.style.display = "none";
            }
            data.results.forEach((usuario) => {
                usuariosTableBody.appendChild(createUsuarioRow(usuario));
            });
        }
    } catch (error) {
        console.error(error);
        showToastMessage("Error al obtener los usuarios.", "error");
    }
}

/**
 * Crea una fila de la tabla para un usuario.
 *
 * @param {Object} usuario - Datos del usuario.
 * @returns {HTMLElement} - Fila de la tabla.
 */
function createUsuarioRow(usuario) {
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${usuario.username}</td>
        <td class="text-uppercase">${usuario.rol}</td>
        <td>${usuario.is_active ? "Sí" : "No"}</td>
        <td class="text-center">
            <button class="btn btn-primary btn-sm" onclick="showUsuarioModal(${usuario.id})">Editar</button>
        </td>
    `;
    return row;
}

/**
 * Guarda los cambios realizados en el modal de usuario.
 *
 * @param {Event} event - Evento del botón de guardar cambios.
 */
async function saveChanges(event) {
    event.preventDefault();

    const usuarioId = document.getElementById("save-changes").getAttribute("data-id");
    if (!usuarioId) {
        showToastMessage("No se pudo obtener el ID del usuario.", "error");
        return;
    }

    const username = document.getElementById("modal-username").value;
    const password = document.getElementById("modal-password").value;

    // Obtener los valores originales del usuario
    const originalUsername = document.getElementById("modal-username").getAttribute("data-original-username");
    const originalPassword = ""; // Asumimos que el campo de contraseña siempre está vacío inicialmente

    // Verificar si no se ha modificado ningún campo
	if (username === originalUsername && !password) {
		showToastMessage("No se ha modificado ningún campo.", "info");
		return;
	}

    if (!username) {
        showToastMessage("El campo username es obligatorio.", "error");
        return;
    }

    const payload = { id: usuarioId, username };
    if (password) payload.password = password;

    try {
        await updateUsuario(payload);
        $("#usuarioModal").modal("hide");
        resetModal();
        fetchUsuarios();
        showToastMessage("Cambios guardados correctamente.", "success");
    } catch (error) {
        console.error("Error al guardar los cambios:", error.message);
        // No es necesario mostrar un toast aquí, ya que `updateUsuario` ya lo hace
    }
}

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