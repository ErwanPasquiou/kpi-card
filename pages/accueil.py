"""Hub KPI-Card et éditeur de tableaux de bord sur six colonnes."""
from pathlib import Path

import streamlit as st

from components.header import ASSETS_DIR, file_to_data_uri, render_header
from components.home_editor import render_home_editor

BASE_DIR = Path(__file__).resolve().parent.parent
wave = file_to_data_uri(ASSETS_DIR / "wave.svg")
css = (BASE_DIR / "styles" / "accueil.css").read_text(encoding="utf-8")
st.html(f'<style>:root {{ --kpi-card-wave-image: url("{wave}"); }}\n{css}</style>')
render_header()
render_home_editor()
