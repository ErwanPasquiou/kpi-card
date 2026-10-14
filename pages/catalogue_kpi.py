"""Catalogue métier et technique des KPI disponibles dans les tableaux de bord."""
from components.home_editor import render_kpi_catalogue
from components.page_frame import render_page_frame

render_page_frame("catalogue_kpi")
render_kpi_catalogue()
