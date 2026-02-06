function navigateToTab(tabName) {
  if (tabName === TAB_HOME) {
    tabHistory = [];
    load();
  } else {
    tabHistory.push('peñas');
    window.history.pushState({ tab: tabName }, '', `#${tabName}`);
    const tabMap = { [TAB_TRUCO]: trucoInit, [TAB_GASTOS]: gastosInit, [TAB_STATS]: stats, [TAB_RULES]: rules };
    tabMap[tabName]?.();
  }
}

function goBackToPreviousTab() {
  if (tabHistory.length === 0) { load(); return; }
  const previousTab = tabHistory.pop();
  window.history.pushState({ tab: previousTab }, '', `#${previousTab}`);
  const tabMap = { [TAB_HOME]: load, [TAB_TRUCO]: trucoInit, [TAB_GASTOS]: gastosInit, [TAB_STATS]: stats, [TAB_RULES]: rules };
  tabMap[previousTab]?.();
}

window.onpopstate = function(event) {
  const modal = $('#modal');
  if (modal && modal.classList.contains('active')) {
    modal.style.display = 'none';
    modal.classList.remove('active');
    return;
  }
  
  const state = event.state;
  if (!state) return;
  
  if (state.screen === 'editor') { cancelStart(); return; }
  if (state.screen === 'trucoBoard') { goBackFromTrucoBoard(); return; }
  
  if (state.tab && tabHistory.length > 0) {
    const previousTab = tabHistory.pop();
    const tabMap = { [TAB_HOME]: load, [TAB_TRUCO]: trucoInit, [TAB_GASTOS]: gastosInit, [TAB_STATS]: stats, [TAB_RULES]: rules };
    tabMap[previousTab]?.();
  } else if (state.tab) {
    load();
  }
};
