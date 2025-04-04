// Función para obtener empleados con filtros y paginación
async function getEmpleados(filters = {}) {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`/getEmpleados?${queryParams}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        return null;
    }
}

async function getEmpleado(id_empleado) {
    try {
        const response = await fetch(`/getEmpleado?id_empleado=${id_empleado}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`Error al obtener el empleado: ${response.statusText}`);
        }
        const empleado = await response.json();
        return empleado;
    } catch (error) {
        showToastMessage('Hubo un problema al obtener la información del empleado.', 'error');
    }
}


// Función para actualizar a un empleado (rol y código de rol)
async function updateEmpleado(clave_empleado, rol, codigo_rol) {
    try {
        const response = await fetch('/updateEmpleado', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clave_empleado: clave_empleado,
                rol_id: rol,
                codigo_rol: codigo_rol
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showToastMessage(data.message || "Error al actualizar empleado.", "error");
            return null;
        }

        showToastMessage(data.message || "Empleado actualizado correctamente.", data.status);
        return data;
    } catch (error) {
        showToastMessage("Error en la solicitud al servidor.", "error");
        return null;
    }
}


// Función para actualizar la lista de empleados
async function updateEmpleados() {
    try {
        const response = await fetch('/update_empleados', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al actualizar empleados');
        }

        const data = await response.json();
        showToastMessage('Empleados actualizados con éxito.', 'success');
        return data;
    } catch (error) {
        showToastMessage(`Error: ${error.message}`, 'error');
        return null;
    }
}


// Función para obtener el token CSRF
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


async function getRoles(){
    try {
        const response = await fetch('/getRoles', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching roles:', error);
        return Error('Error fetching roles');
    }
}