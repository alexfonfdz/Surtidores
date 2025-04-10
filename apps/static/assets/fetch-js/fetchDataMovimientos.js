// Función para obtener almacenes
async function fetchAlmacenes() {
    try {
        const response = await fetch('/get_almacen', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error('Hubo un problema al obtener los almacenes.');
    }
}

// Función para obtener vendedores
async function fetchVendedores() {
    try {
        const response = await fetch('/get_vendedores', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        return [];
    }
}

// Función para obtener monedas
async function fetchMonedas() {
    try {
        const response = await fetch('/get_moneda', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error('Hubo un problema al obtener las monedas.');
    }
}
// Función para obtener monedas
async function fetchSurtidores() {
    try {
        const response = await fetch('/get_surtidor', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error('Hubo un problema al obtener los surtidores.');
    }
}

// Función para obtener ventas
async function fetchMovimientos(filters) {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`/get_movimientos?${queryParams}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        return { results: [], current_page: 1, num_pages: 1, has_previous: false, has_next: false };
    }
}

async function fetchMovimiento(movimientoId) {
    try {
        const response = await fetch(`/get_movimiento?movimiento_id=${movimientoId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`Error al obtener el movimiento: ${response.statusText}`);
        }
        const venta = await response.json();
        return venta;
    } catch (error) {
        throw new Error('Hubo un problema al obtener el movimiento.');
    }
}

async function fetchMovimientoDetalle(movimientoId) {
    try {
        const response = await fetch(`/get_movimiento_detalle?movimiento_id=${movimientoId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
    });
        if (!response.ok) {
            throw new Error(`Error al obtener los detalles del movimiento: ${response.statusText}`);
        }
        const detalles = await response.json();
        return detalles;
    } catch (error) {
        throw new Error('Hubo un problema al obtener los detalles del movimiento.');
    }
}

async function updateMovimientoDetalle(movimientoId, surtidorId, detalles) {
    try {
        const response = await fetch(`/update_movimiento_detalle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken') // Asegúrate de que getCookie funcione bien
            },
            body: JSON.stringify({ 
                detalle_venta: detalles,
                movimiento_id: movimientoId,
                surtidor_id: surtidorId
            })
        });

        // Verifica primero si la respuesta es exitosa
        if (!response.ok) {
            const errorResult = await response.json();  // Intenta leer el cuerpo de error si existe
            throw new Error(errorResult.error || 'Error al actualizar el detalle de la venta.');
        }

        const result = await response.json();  // Solo parsea si la respuesta es correcta
        return result;

    } catch (error) {
        throw error;  // Rethrow para que el error pueda ser manejado más arriba si es necesario
    }
}
