"""Point d'entrée de l'application KPI-Card."""
import streamlit as st

st.set_page_config(page_title="Accueil | KPI-Card", page_icon="📊", layout="wide")
st.navigation(
    [st.Page("pages/accueil.py", title="Accueil", default=True)],
    position="hidden",
).run()
