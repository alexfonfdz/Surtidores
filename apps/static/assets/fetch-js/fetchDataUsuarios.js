/**
 * Realiza una solicitud para obtener los usuarios de la API aplicando
 * los filtros que se pasan como parámetro.
 *
 * @param {Object} filters - Objeto que contiene los filtros a aplicar en la búsqueda de usuarios.
 * @returns {Promise<Object>} - Promesa que resuelve con los datos de los usuarios.
 * @throws {Error} - Lanza un error si la solicitud falla.
 */
async function getUsuarios() {	

	try {
		const response = await fetch(`/getUsuarios`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Error al obtener los usuarios");
		}

		const data = await response.json();
		return data;
	} catch (error) {
		throw new Error(error.error || "Error al obtener los usuarios");
	}
}

/**
 * Obtiene los datos de un usuario especifico a partir de su ID.
 *
 * @param {number|string} id_usuario - ID del usuario a obtener.
 * @returns {Promise<Object>} - Promesa que resuelve con los datos del usuario.
 * @returns {Error} - Lanza un error si la solicitud falla.
 */
async function getUsuario(id_usuario) {
    try {
        const response = await fetch(`/getUsuario`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id: id_usuario }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Error al obtener usuario");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error(error.message || "Error al obtener usuario");
    }
}

/**
 * Actualiza los datos de un usuario existente en la base de datos.
 *
 * @param {Object} payload - Objeto que contiene los datos del usuario a actualizar.
 * @returns {Promise<Object>} - Promesa que resuelve con los datos del usuario actualizado.
 * @throws {Error} - Lanza un error si la solicitud falla.
 */
async function updateUsuario(payload) {
    const response = await fetch(`/updateUsuario`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"			
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const contentType = response.headers.get("Content-Type");
        if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json(); // Leer el cuerpo de la respuesta una vez
            if (Array.isArray(errorData.error)) {
                // Mostrar cada mensaje de error en un toast separado
                errorData.error.forEach((errorMessage) => {
                    showToastMessage(errorMessage, "error");
                });
            } else {
                showToastMessage(errorData.error || "Error al guardar los cambios", "error");
            }
        } else {
            const errorText = await response.text();
            showToastMessage("Error inesperado en el servidor", "error");
        }
        throw new Error("Error en la solicitud al servidor"); // Lanzar un error para detener el flujo
    }

    return response.json(); // Leer el cuerpo de la respuesta solo si la solicitud fue exitosa
}