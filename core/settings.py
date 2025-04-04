# -- encoding: utf-8 --
"""
Copyright (c) 2019 - present AppSeed.us
"""

import os
from decouple import config
from unipath import Path
from dotenv import load_dotenv

load_dotenv()
ENV_SECRET_KEY = os.getenv('SECRET_KEY')
ENV_DEBUG = os.getenv('DEBUG')
ENV_SERVER = os.getenv('SERVER')
ENV_MYSQL_NAME = os.getenv('MYSQL_NAME')
ENV_MYSQL_USER = os.getenv('MYSQL_USER')
ENV_MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD')
ENV_MYSQL_HOST = os.getenv('MYSQL_HOST')
ENV_MYSQL_PORT = os.getenv('MYSQL_PORT')
ENV_PSQL_NAME = os.getenv('PSQL_NAME')
ENV_PSQL_USER = os.getenv('PSQL_USER')
ENV_PSQL_PASSWORD = os.getenv('PSQL_PASSWORD')
ENV_PSQL_HOST = os.getenv('PSQL_HOST')
ENV_PSQL_PORT = os.getenv('PSQL_PORT')
ENV_SCHEMA = os.getenv('SCHEMA')
ENV_YEAR = os.getenv('YEAR')
ENV_MONTH = os.getenv('MONTH')
ENV_DAY = os.getenv('DAY')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'authentication.CustomUser'

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = Path(__file__).parent
CORE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default=ENV_SECRET_KEY)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=ENV_DEBUG, cast=bool)

# load production server from .env
ALLOWED_HOSTS = [ENV_MYSQL_HOST, ENV_SERVER, config('SERVER', default=ENV_SERVER)]

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'apps.home',  # Enable the inner home (home)
    'apps.authentication',  # Enable the inner home (authentication)
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.middleware.RoleRequiredMiddleware',
]

ROOT_URLCONF = 'core.urls'
LOGIN_REDIRECT_URL = "home"  # Route defined in home/urls.py
LOGOUT_REDIRECT_URL = "home"  # Route defined in home/urls.py
TEMPLATE_DIR = os.path.join(CORE_DIR, "apps/templates")  # ROOT dir for templates

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [TEMPLATE_DIR],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# Database
# https://docs.djangoproject.com/en/3.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': ENV_MYSQL_NAME,
        'USER': ENV_MYSQL_USER,
        'PASSWORD': ENV_MYSQL_PASSWORD,
        'HOST': ENV_MYSQL_HOST,  
        'PORT': ENV_MYSQL_PORT,
        'OPTIONS': {
            'charset': 'utf8mb4',
        }
    }
}

# Password validation
# https://docs.djangoproject.com/en/3.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
# https://docs.djangoproject.com/en/3.0/topics/i18n/

LANGUAGE_CODE = 'es'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True

#############################################################
# SRC: https://devcenter.heroku.com/articles/django-assets

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.9/howto/static-files/
STATIC_ROOT = os.path.join(CORE_DIR, 'staticfiles')
STATIC_URL = '/static/'

# Extra places for collectstatic to find static files.
STATICFILES_DIRS = (
    os.path.join(CORE_DIR, 'apps/static'),
)


#############################################################
#############################################################