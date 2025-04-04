async function fetchReporteRepartidores(filters) {
    const params = new URLSearchParams(filters).toString();
    const response = await fetch(`/get_reporte_repartidores?${params}`, {
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

async function fetchMovimientosRepartidor(filters) {
    const params = new URLSearchParams(filters).toString();
    const response = await fetch(`/get_movimientos_repartidor?${params}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

async function fetchMovimientoDetalleRepartidor(movimientoId) {

    const response = await fetch(`/get_movimientodetalle_repartidor?movimiento_id=${movimientoId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}