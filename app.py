"""Point d'entrée de l'application KPI-Card."""
import streamlit as st

st.set_page_config(page_title="KPI-Card", page_icon="📊", layout="wide")
st.navigation(
    [
        st.Page("pages/accueil.py", title="Accueil", default=True),
        st.Page("pages/catalogue_kpi.py", title="Catalogue KPI", url_path="catalogue-kpi"),
    ],
    position="hidden",
).run()
