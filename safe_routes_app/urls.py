__author__ = 'Edgar'

from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^crimes/', views.get_crimes, name='crimes')
]