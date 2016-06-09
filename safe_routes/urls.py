from django.conf.urls import include,url
from safe_routes_app import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^routes/', include('safe_routes_app.urls')),
]
