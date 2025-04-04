from django.db import migrations

def create_default_users(apps, schema_editor):
    User = apps.get_model('authentication', 'CustomUser')
    Rol = apps.get_model('authentication', 'Rol')

    # Usuarios por defecto
    default_users = [
        {'username': 'admin', 'password': 'admin', 'rol': 'Administrador'},
        {'username': 'repartidor', 'password': 'repartidor', 'rol': 'Repartidor'},
        {'username': 'surtidor', 'password': 'surtidor', 'rol': 'Surtidor'},
        {'username': 'panel', 'password': 'panel', 'rol': 'Panel'},
    ]

    for user_data in default_users:
        if not User.objects.filter(username=user_data['username']).exists():
            rol = Rol.objects.get(nombre=user_data['rol'])
            user = User.objects.create_user(
                username=user_data['username'],
                password=user_data['password'],
            )
            user.rol = rol
            user.save()

class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0002_add_default_roles'),
    ]

    operations = [
        migrations.RunPython(create_default_users),
    ]