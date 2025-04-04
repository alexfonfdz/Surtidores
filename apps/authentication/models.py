# -- encoding: utf-8 --
"""
Copyright (c) 2019 - present AppSeed.us
"""

from django.db import models

from django.contrib.auth.models import AbstractUser

class Rol(models.Model):
    nombre = models.CharField(max_length=50)

    class Meta:
        db_table = 'roles'
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'

class CustomUser(AbstractUser):
    rol = models.ForeignKey(Rol, on_delete=models.SET_NULL, null=True, blank=True, default=None)
    created_by_id = models.ForeignKey('self', related_name='created_by', on_delete=models.PROTECT, blank=True, null=True)
    modified_by_id = models.ForeignKey('self', related_name='modified_by', on_delete=models.PROTECT, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True, blank=True, null=True)

    class Meta:
        db_table = 'auth_user'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'


# Create your models here.