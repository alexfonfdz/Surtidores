async function fetchMovimientosEntregadosDomicilio(params={}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`/get_movimientos_entregados_domicilio?${query}`, {
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
}

async function updateMovimientoRepartido(movimientoId, codigoRepartidor) {
    const url = '/update_movimiento_repartidor'; // Asegúrate de que esta URL coincida con la configuración en urls.py
    const payload = {
        movimiento_id: movimientoId,
        codigo_repartidor: codigoRepartidor
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken() // Si usas CSRF, asegúrate de incluir el token
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al actualizar el movimiento');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error en updatePanelRepartidorMovimiento:', error.message);
        throw error;
    }
}

// Función para obtener el token CSRF (si es necesario)
function getCSRFToken() {
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
    return cookieValue || '';
}