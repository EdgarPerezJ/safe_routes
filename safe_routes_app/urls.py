__author__ = 'Edgar'

from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^crimes/', views.get_crimes, name='crimes'),
    url(r'^crime_descriptions/', views.get_crime_descriptions, name='crime_descriptions'),
    url(r'^crimes_detail/(?P<date>[0-9\-]+)/(?P<location_id>[0-9]+)/$', views.get_crimes_detail, name='crimes_detail')
]