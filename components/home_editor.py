"""Hub de tableaux de bord KPI-Card, compatible avec Streamlit 1.38."""

from pathlib import Path

import streamlit as st
from streamlit.components.v1 import declare_component


_editor = declare_component(
    "home_editor", path=str(Path(__file__).parent / "home_editor_frontend")
)


def render_home_editor():
    """La version enregistrée est conservée dans le navigateur et la session."""
    collection = _editor(
        initial=st.session_state.get("dashboard_collection"),
        legacy=st.session_state.get("home_layout"),
        storage_key="kpi-card:dashboards:v2",
        key="home_editor",
        default=None,
    )
    if isinstance(collection, dict) and collection.get("version") == 2:
        st.session_state["dashboard_collection"] = collection
