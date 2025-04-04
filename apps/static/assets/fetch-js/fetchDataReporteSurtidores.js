async function fetchReporteSurtidores(filters) {
    const params = new URLSearchParams(filters).toString();
    const response = await fetch(`/get_reporte_surtidores?${params}`, {
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

async function fetchMovimientosSurtidor(filters) {
    const params = new URLSearchParams(filters).toString();
    const response = await fetch(`/get_movimientos_surtidor?${params}`, {
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

async function fetchMovimientoDetalleSurtidor(movimientoId) {

    const response = await fetch(`/get_movimientodetalle_surtidor?movimiento_id=${movimientoId}`, {
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

async function fetchEmpleadoByCodigoSurtidor(codigoSurtidor) {
    try {
        const response = await fetch(`get_empleado_por_codigo?codigo_surtidor=${codigoSurtidor}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error desconocido');
        }

        const empleado = await response.json();
        return empleado;
    } catch (error) {
        return null;
    }
}

async function fetchEmpleadoByCodigoPanel(codigoPanel) {
    try {
        const response = await fetch(`get_empleado_por_codigo_panel?codigo_panel=${codigoPanel}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error desconocido');
        }

        const empleado = await response.json();
        return empleado;
    } catch (error) {
        return null;
    }
}