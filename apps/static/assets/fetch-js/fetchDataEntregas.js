// async function fetchSurtidoresDelDia() {
//     const response = await fetch(`/get_surtidores_del_dia`, {
//         method: 'GET',
//         headers: {
//             'Content-Type': 'application/json'
//         }
//     });
//     if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//     }
//     const data = await response.json();
//     return data;
// }

async function fetchMovimientosPendientes(params={}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`/get_movimientos_pendientes?${query}`, {
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

async function updateProcesoSurtir(movimientoId, codigoSurtidor) {
    const response = await fetch(`/proceso_surtir`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken') 
        },
        body: JSON.stringify({ 
            movimiento_id: movimientoId,
            codigo_surtidor: codigoSurtidor
        })
    });

    if (!response.ok) {
        const errorResult = await response.json(); 
        throw new Error(errorResult.error || 'Error al surtir la venta.');
    }

    const result = await response.json();  
    return result;
}

async function getMovimientoFolio(folio) {
    try {
        const response = await fetch(`/get_venta_by_folio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken') 
            },
            body: JSON.stringify({ 
                folio: folio
            })
        });

        if (!response.ok) {
            const errorResult = await response.json(); 
            throw new Error(errorResult.error || 'Error al obtener la venta.');
        }

        const result = await response.json();  
        return result;

    } catch (error) {
        showMessage('Hubo un problema al obtener la venta.', 'error');
        throw error;  
    }
}

async function fetchActualizarMovimientosAdmintotal() { 
    const response = await fetch(`/get_movimientos_admin_to_mysql`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    if (response.ok) {
        return true;
    } else {
        throw new Error(`HTTP error! status: ${response.status}`); 
    }
}