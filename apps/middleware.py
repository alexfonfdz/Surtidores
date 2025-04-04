from django.shortcuts import redirect
from django.urls import reverse

class RoleRequiredMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        if request.path in ['/usuarios.html', '/empleados.html', '/entregas.html', '/panel.html', '/repartidor.html', '/reporte-surtidores.html', '/reporte-repartidores.html','/pedidos-remisiones.html']:
            if not request.user.is_authenticated:
                return redirect(reverse('login'))
            if request.path == '/usuarios.html' and request.user.rol_id != 1:
                return redirect(reverse('home'))
            if request.path == '/empleados.html' and request.user.rol_id != 1:
                return redirect(reverse('home'))
            if request.path == '/entregas.html' and request.user.rol_id not in [1, 2]:
                return redirect(reverse('home'))
            if request.path == '/panel.html' and request.user.rol_id not in [1, 3]:
                return redirect(reverse('home'))
            if request.path == '/repartidor.html' and request.user.rol_id not in [1, 4]:
                return redirect(reverse('home'))
            if request.path == '/reporte-surtidores.html' and request.user.rol_id != 1:
                return redirect(reverse('home'))
            if request.path == '/reporte-repartidores.html' and request.user.rol_id != 1:
                return redirect(reverse('home'))
            if request.path == '/pedidos-remisiones.html' and request.user.rol_id not in [1, 2]:
                return redirect(reverse('home'))
        return None