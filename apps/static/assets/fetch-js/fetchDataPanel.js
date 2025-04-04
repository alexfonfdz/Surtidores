async function fetchMovimientosEntregados(params={}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`/get_movimientos_entregados?${query}`, {
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

async function fetchRepartidores() {
    try {
        const response = await fetch('/get_repartidores', {
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
        throw new Error('Hubo un problema al obtener los repartidores.');
    }
}

async function updatePanelRepartidorMovimiento(movimientoId, repartidorId, panelId, codigoPanel, codigoRepartidor) {
    const url = '/update_panel_repartidor_movimiento'; // Asegúrate de que esta URL coincida con la configuración en urls.py
    const payload = {
        movimiento_id: movimientoId,
        repartidor_id: repartidorId,
        panel_id: panelId,
        codigo_panel: codigoPanel,
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