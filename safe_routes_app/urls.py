__author__ = 'Edgar'

from django.conf.urls import url
from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^crime_types_info/', views.get_crime_types_info, name='crime_types_info'),
    url(r'^crime_seriousness/', views.get_crime_seriousness, name='crime_seriousness'),
    url(r'^crimes_detail/(?P<date>[0-9\-]+)/(?P<location_id>[0-9]+)/$', views.get_crimes_detail, name='crimes_detail')
]