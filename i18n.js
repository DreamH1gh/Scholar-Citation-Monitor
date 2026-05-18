// i18n.js - Internationalization engine for Scholar Citation Monitor
const I18n = {
    currentLang: 'zh',

    localeMap: {
        zh: 'zh-CN',
        en: 'en-US',
        de: 'de-DE',
        fr: 'fr-FR',
        ko: 'ko-KR',
        ja: 'ja-JP',
        es: 'es-ES',
        pt: 'pt-BR'
    },

    translations: {
        // ========== Chinese (zh) ==========
        zh: {
            // Header & static elements
            last_update_never: '最后更新: 从未更新',
            last_update_never_short: '最后更新: 从未',
            no_stats: '暂无统计数据',
            loading: '正在加载...',
            input_placeholder: '输入 Google Scholar 作者页面 URL',

            // Buttons
            btn_add: '添加',
            btn_refresh: '刷新',
            btn_adding: '添加中...(获取完整论文列表)',
            btn_refreshing: '刷新中...(更新完整论文列表)',
            mark_read: '已读',

            // Labels
            label_institution: '机构:',
            label_fields: '研究领域:',
            label_total_papers: '总论文数:',
            label_total_citations: '总引用',
            label_h_index: 'H指数',
            label_i10_index: 'i10指数',

            // Fallback values
            unknown_institution: '未知机构',
            unknown_fields: '未知领域',
            new_scholar: '新学者',
            paper_counter: '篇',

            // Access info
            access_via: '通过 {domain} 访问',
            last_updated: '最后更新: ',

            // Author card
            paper_changes_btn: '论文变化 ({count})',
            empty_state: '暂无作者数据<br><small>请在上方输入Google Scholar作者页面URL</small>',

            // Stats summary
            stats_summary: '监控 {totalAuthors} 位学者，共 {totalPapers} 篇论文，总引用 {totalCitations} 次',
            stats_new_changes: '({count} 位有新变化)',

            // Paper changes modal
            paper_changes_title: '{name} - 论文引用变化 ({count} 篇)',
            view_details: '查看详情',

            // Alerts & confirms
            alert_invalid_url: '请输入有效的Google Scholar作者页面URL',
            alert_fetch_failed: '获取作者信息失败: {error}',
            alert_no_authors: '没有要刷新的作者',
            alert_no_paper_changes: '该作者暂无论文引用变化记录',
            confirm_delete: '确定要删除这个作者吗？',
            refresh_result: '刷新完成！成功: {success}, 失败: {fail}',
            refresh_failed_authors: '失败的作者: {names}',

            // Background notifications
            notify_installed: '扩展已安装，将每30分钟自动监控学者引用变化',
            notify_error_title: 'Scholar Monitor 错误',
            notify_refresh_failed: '自动刷新失败: {error}',
            notify_citation_update: '🎉 引用数量更新',
            notify_single_change: '{name} 的总引用从 {old} 增加到 {new} (+{increase})',
            notify_paper_changes_single: '其中 {count} 篇论文引用发生变化',
            notify_multi_citations: '{count} 位学者总引用增加 {total} 次',
            notify_multi_papers: '共 {count} 篇论文引用发生变化',
            notify_multi_title: '🎉 {count} 位学者引用更新'
        },

        // ========== English (en) ==========
        en: {
            last_update_never: 'Last update: Never',
            last_update_never_short: 'Last update: Never',
            no_stats: 'No statistics available',
            loading: 'Loading...',
            input_placeholder: 'Enter Google Scholar author page URL',

            btn_add: 'Add',
            btn_refresh: 'Refresh',
            btn_adding: 'Adding...(fetching paper list)',
            btn_refreshing: 'Refreshing...(updating paper list)',
            mark_read: 'Read',

            label_institution: 'Institution:',
            label_fields: 'Research Fields:',
            label_total_papers: 'Total Papers:',
            label_total_citations: 'Citations',
            label_h_index: 'H-Index',
            label_i10_index: 'i10-Index',

            unknown_institution: 'Unknown Institution',
            unknown_fields: 'Unknown Fields',
            new_scholar: 'New Scholar',
            paper_counter: 'papers',

            access_via: 'via {domain}',
            last_updated: 'Last updated: ',

            paper_changes_btn: 'Changes ({count})',
            empty_state: 'No author data<br><small>Please enter a Google Scholar author page URL above</small>',

            stats_summary: 'Monitoring {totalAuthors} scholars, {totalPapers} papers, {totalCitations} total citations',
            stats_new_changes: '({count} with new changes)',

            paper_changes_title: '{name} - Paper Citation Changes ({count} papers)',
            view_details: 'View Details',

            alert_invalid_url: 'Please enter a valid Google Scholar author page URL',
            alert_fetch_failed: 'Failed to fetch author info: {error}',
            alert_no_authors: 'No authors to refresh',
            alert_no_paper_changes: 'No paper citation changes for this author',
            confirm_delete: 'Are you sure you want to delete this author?',
            refresh_result: 'Refresh complete! Success: {success}, Failed: {fail}',
            refresh_failed_authors: 'Failed authors: {names}',

            notify_installed: 'Extension installed. Will auto-monitor citation changes every 30 minutes',
            notify_error_title: 'Scholar Monitor Error',
            notify_refresh_failed: 'Auto-refresh failed: {error}',
            notify_citation_update: '🎉 Citation Update',
            notify_single_change: '{name} citations increased from {old} to {new} (+{increase})',
            notify_paper_changes_single: '{count} papers with citation changes',
            notify_multi_citations: '{count} scholars with {total} total citation increases',
            notify_multi_papers: '{count} papers with citation changes in total',
            notify_multi_title: '🎉 {count} Scholars Updated'
        },

        // ========== German (de) ==========
        de: {
            last_update_never: 'Letzte Aktualisierung: Nie',
            last_update_never_short: 'Letzte Aktualisierung: Nie',
            no_stats: 'Keine Statistiken verfügbar',
            loading: 'Laden...',
            input_placeholder: 'Google Scholar Autorenseite URL eingeben',

            btn_add: 'Hinzufügen',
            btn_refresh: 'Aktualisieren',
            btn_adding: 'Hinzufügen...(Papiere werden geladen)',
            btn_refreshing: 'Aktualisieren...(Papiere werden aktualisiert)',
            mark_read: 'Gelesen',

            label_institution: 'Institution:',
            label_fields: 'Forschungsgebiete:',
            label_total_papers: 'Gesamtarbeiten:',
            label_total_citations: 'Zitationen',
            label_h_index: 'h-Index',
            label_i10_index: 'i10-Index',

            unknown_institution: 'Unbekannte Institution',
            unknown_fields: 'Unbekannte Gebiete',
            new_scholar: 'Neuer Forscher',
            paper_counter: 'Arbeiten',

            access_via: 'über {domain}',
            last_updated: 'Zuletzt aktualisiert: ',

            paper_changes_btn: 'Änderungen ({count})',
            empty_state: 'Keine Autorendaten<br><small>Bitte geben Sie oben eine Google Scholar Autorenseite URL ein</small>',

            stats_summary: '{totalAuthors} Forscher, {totalPapers} Arbeiten, {totalCitations} Zitationen insgesamt',
            stats_new_changes: '({count} mit neuen Änderungen)',

            paper_changes_title: '{name} - Zitationsänderungen ({count} Arbeiten)',
            view_details: 'Details anzeigen',

            alert_invalid_url: 'Bitte geben Sie eine gültige Google Scholar Autorenseite URL ein',
            alert_fetch_failed: 'Autoreninformationen konnten nicht geladen werden: {error}',
            alert_no_authors: 'Keine Autoren zum Aktualisieren',
            alert_no_paper_changes: 'Keine Zitationsänderungen für diesen Autor',
            confirm_delete: 'Möchten Sie diesen Autor wirklich löschen?',
            refresh_result: 'Aktualisierung abgeschlossen! Erfolgreich: {success}, Fehlgeschlagen: {fail}',
            refresh_failed_authors: 'Fehlgeschlagene Autoren: {names}',

            notify_installed: 'Erweiterung installiert. Automatische Überwachung alle 30 Minuten',
            notify_error_title: 'Scholar Monitor Fehler',
            notify_refresh_failed: 'Automatische Aktualisierung fehlgeschlagen: {error}',
            notify_citation_update: '🎉 Zitationsaktualisierung',
            notify_single_change: '{name} Zitationen von {old} auf {new} gestiegen (+{increase})',
            notify_paper_changes_single: '{count} Arbeiten mit Zitationsänderungen',
            notify_multi_citations: '{count} Forscher mit {total} neuen Zitationen',
            notify_multi_papers: '{count} Arbeiten mit Zitationsänderungen',
            notify_multi_title: '🎉 {count} Forscher aktualisiert'
        },

        // ========== French (fr) ==========
        fr: {
            last_update_never: 'Dernière mise à jour : Jamais',
            last_update_never_short: 'Dernière mise à jour : Jamais',
            no_stats: 'Aucune statistique disponible',
            loading: 'Chargement...',
            input_placeholder: 'Entrez l\'URL de la page auteur Google Scholar',

            btn_add: 'Ajouter',
            btn_refresh: 'Actualiser',
            btn_adding: 'Ajout en cours...(récupération des publications)',
            btn_refreshing: 'Actualisation...(mise à jour des publications)',
            mark_read: 'Lu',

            label_institution: 'Institution :',
            label_fields: 'Domaines de recherche :',
            label_total_papers: 'Total publications :',
            label_total_citations: 'Citations',
            label_h_index: 'Indice h',
            label_i10_index: 'Indice i10',

            unknown_institution: 'Institution inconnue',
            unknown_fields: 'Domaines inconnus',
            new_scholar: 'Nouveau chercheur',
            paper_counter: 'publications',

            access_via: 'via {domain}',
            last_updated: 'Dernière mise à jour : ',

            paper_changes_btn: 'Changements ({count})',
            empty_state: 'Aucune donnée d\'auteur<br><small>Veuillez entrer l\'URL d\'une page auteur Google Scholar ci-dessus</small>',

            stats_summary: '{totalAuthors} chercheurs, {totalPapers} publications, {totalCitations} citations au total',
            stats_new_changes: '({count} avec de nouveaux changements)',

            paper_changes_title: '{name} - Changements de citations ({count} publications)',
            view_details: 'Voir les détails',

            alert_invalid_url: 'Veuillez entrer une URL de page auteur Google Scholar valide',
            alert_fetch_failed: 'Échec de la récupération des informations : {error}',
            alert_no_authors: 'Aucun auteur à actualiser',
            alert_no_paper_changes: 'Aucun changement de citation pour cet auteur',
            confirm_delete: 'Voulez-vous vraiment supprimer cet auteur ?',
            refresh_result: 'Actualisation terminée ! Réussite : {success}, Échec : {fail}',
            refresh_failed_authors: 'Auteurs échoués : {names}',

            notify_installed: 'Extension installée. Surveillance automatique toutes les 30 minutes',
            notify_error_title: 'Erreur Scholar Monitor',
            notify_refresh_failed: 'Échec de l\'actualisation automatique : {error}',
            notify_citation_update: '🎉 Mise à jour des citations',
            notify_single_change: 'Les citations de {name} sont passées de {old} à {new} (+{increase})',
            notify_paper_changes_single: '{count} publications avec des changements de citations',
            notify_multi_citations: '{count} chercheurs avec {total} nouvelles citations',
            notify_multi_papers: '{count} publications avec des changements de citations',
            notify_multi_title: '🎉 {count} chercheurs mis à jour'
        },

        // ========== Korean (ko) ==========
        ko: {
            last_update_never: '마지막 업데이트: 없음',
            last_update_never_short: '마지막 업데이트: 없음',
            no_stats: '통계 데이터 없음',
            loading: '로딩 중...',
            input_placeholder: 'Google Scholar 저자 페이지 URL 입력',

            btn_add: '추가',
            btn_refresh: '새로고침',
            btn_adding: '추가 중...(논문 목록 가져오는 중)',
            btn_refreshing: '새로고침 중...(논문 목록 업데이트 중)',
            mark_read: '읽음',

            label_institution: '소속 기관:',
            label_fields: '연구 분야:',
            label_total_papers: '전체 논문:',
            label_total_citations: '인용 횟수',
            label_h_index: 'h-지수',
            label_i10_index: 'i10-지수',

            unknown_institution: '알 수 없는 기관',
            unknown_fields: '알 수 없는 분야',
            new_scholar: '신규 학자',
            paper_counter: '편',

            access_via: '{domain} 통해 접속',
            last_updated: '마지막 업데이트: ',

            paper_changes_btn: '논문 변화 ({count})',
            empty_state: '저자 데이터 없음<br><small>위에 Google Scholar 저자 페이지 URL을 입력하세요</small>',

            stats_summary: '{totalAuthors}명 학자 모니터링, 총 {totalPapers}편 논문, 총 인용 {totalCitations}회',
            stats_new_changes: '(새 변화 {count}명)',

            paper_changes_title: '{name} - 논문 인용 변화 ({count}편)',
            view_details: '상세 보기',

            alert_invalid_url: '유효한 Google Scholar 저자 페이지 URL을 입력하세요',
            alert_fetch_failed: '저자 정보 가져오기 실패: {error}',
            alert_no_authors: '새로고침할 저자가 없습니다',
            alert_no_paper_changes: '이 저자의 논문 인용 변화 기록이 없습니다',
            confirm_delete: '이 저자를 삭제하시겠습니까?',
            refresh_result: '새로고침 완료! 성공: {success}, 실패: {fail}',
            refresh_failed_authors: '실패한 저자: {names}',

            notify_installed: '확장 프로그램이 설치되었습니다. 30분마다 자동 모니터링합니다',
            notify_error_title: 'Scholar Monitor 오류',
            notify_refresh_failed: '자동 새로고침 실패: {error}',
            notify_citation_update: '🎉 인용 횟수 업데이트',
            notify_single_change: '{name} 인용 횟수 {old}에서 {new}로 증가 (+{increase})',
            notify_paper_changes_single: '{count}편 논문 인용 변화',
            notify_multi_citations: '{count}명 학자 총 인용 {total}회 증가',
            notify_multi_papers: '총 {count}편 논문 인용 변화',
            notify_multi_title: '🎉 {count}명 학자 업데이트'
        },

        // ========== Japanese (ja) ==========
        ja: {
            last_update_never: '最終更新: なし',
            last_update_never_short: '最終更新: なし',
            no_stats: '統計データなし',
            loading: '読み込み中...',
            input_placeholder: 'Google Scholar 著者ページURLを入力',

            btn_add: '追加',
            btn_refresh: '更新',
            btn_adding: '追加中...(論文リストを取得中)',
            btn_refreshing: '更新中...(論文リストを更新中)',
            mark_read: '既読',

            label_institution: '所属機関:',
            label_fields: '研究分野:',
            label_total_papers: '総論文数:',
            label_total_citations: '被引用数',
            label_h_index: 'h指数',
            label_i10_index: 'i10指数',

            unknown_institution: '不明な機関',
            unknown_fields: '不明な分野',
            new_scholar: '新規研究者',
            paper_counter: '件',

            access_via: '{domain} 経由',
            last_updated: '最終更新: ',

            paper_changes_btn: '論文変化 ({count})',
            empty_state: '著者データなし<br><small>上記にGoogle Scholar著者ページURLを入力してください</small>',

            stats_summary: '{totalAuthors}名の研究者を監視、{totalPapers}件の論文、総被引用 {totalCitations}回',
            stats_new_changes: '(新変化 {count}名)',

            paper_changes_title: '{name} - 論文被引用変化 ({count}件)',
            view_details: '詳細を見る',

            alert_invalid_url: '有効なGoogle Scholar著者ページURLを入力してください',
            alert_fetch_failed: '著者情報の取得に失敗しました: {error}',
            alert_no_authors: '更新する著者がいません',
            alert_no_paper_changes: 'この著者の論文被引用変化記録はありません',
            confirm_delete: 'この著者を削除してもよろしいですか？',
            refresh_result: '更新完了！成功: {success}, 失敗: {fail}',
            refresh_failed_authors: '失敗した著者: {names}',

            notify_installed: '拡張機能がインストールされました。30分ごとに自動監視します',
            notify_error_title: 'Scholar Monitor エラー',
            notify_refresh_failed: '自動更新に失敗しました: {error}',
            notify_citation_update: '🎉 被引用数アップデート',
            notify_single_change: '{name}の被引用数が{old}から{new}に増加 (+{increase})',
            notify_paper_changes_single: '{count}件の論文に被引用変化',
            notify_multi_citations: '{count}名の研究者が合計{total}回被引用増加',
            notify_multi_papers: '合計{count}件の論文に被引用変化',
            notify_multi_title: '🎉 {count}名の研究者がアップデート'
        },

        // ========== Spanish (es) ==========
        es: {
            last_update_never: 'Última actualización: Nunca',
            last_update_never_short: 'Última actualización: Nunca',
            no_stats: 'Sin estadísticas disponibles',
            loading: 'Cargando...',
            input_placeholder: 'Ingrese la URL de la página de autor de Google Scholar',

            btn_add: 'Agregar',
            btn_refresh: 'Actualizar',
            btn_adding: 'Agregando...(obteniendo lista de publicaciones)',
            btn_refreshing: 'Actualizando...(actualizando lista de publicaciones)',
            mark_read: 'Leído',

            label_institution: 'Institución:',
            label_fields: 'Campos de investigación:',
            label_total_papers: 'Total publicaciones:',
            label_total_citations: 'Citas',
            label_h_index: 'Índice h',
            label_i10_index: 'Índice i10',

            unknown_institution: 'Institución desconocida',
            unknown_fields: 'Campos desconocidos',
            new_scholar: 'Nuevo investigador',
            paper_counter: 'publicaciones',

            access_via: 'vía {domain}',
            last_updated: 'Última actualización: ',

            paper_changes_btn: 'Cambios ({count})',
            empty_state: 'Sin datos de autor<br><small>Ingrese la URL de la página de autor de Google Scholar arriba</small>',

            stats_summary: 'Monitoreando {totalAuthors} investigadores, {totalPapers} publicaciones, {totalCitations} citas en total',
            stats_new_changes: '({count} con nuevos cambios)',

            paper_changes_title: '{name} - Cambios en citas ({count} publicaciones)',
            view_details: 'Ver detalles',

            alert_invalid_url: 'Ingrese una URL válida de página de autor de Google Scholar',
            alert_fetch_failed: 'Error al obtener información del autor: {error}',
            alert_no_authors: 'No hay autores para actualizar',
            alert_no_paper_changes: 'Sin cambios de citas para este autor',
            confirm_delete: '¿Está seguro de que desea eliminar este autor?',
            refresh_result: '¡Actualización completa! Éxito: {success}, Fallo: {fail}',
            refresh_failed_authors: 'Autores fallidos: {names}',

            notify_installed: 'Extensión instalada. Monitoreo automático cada 30 minutos',
            notify_error_title: 'Error de Scholar Monitor',
            notify_refresh_failed: 'Actualización automática fallida: {error}',
            notify_citation_update: '🎉 Actualización de citas',
            notify_single_change: 'Las citas de {name} aumentaron de {old} a {new} (+{increase})',
            notify_paper_changes_single: '{count} publicaciones con cambios de citas',
            notify_multi_citations: '{count} investigadores con {total} citas nuevas',
            notify_multi_papers: '{count} publicaciones con cambios de citas en total',
            notify_multi_title: '🎉 {count} investigadores actualizados'
        },

        // ========== Portuguese (pt) ==========
        pt: {
            last_update_never: 'Última atualização: Nunca',
            last_update_never_short: 'Última atualização: Nunca',
            no_stats: 'Sem estatísticas disponíveis',
            loading: 'Carregando...',
            input_placeholder: 'Insira a URL da página de autor do Google Scholar',

            btn_add: 'Adicionar',
            btn_refresh: 'Atualizar',
            btn_adding: 'Adicionando...(obtendo lista de publicações)',
            btn_refreshing: 'Atualizando...(atualizando lista de publicações)',
            mark_read: 'Lido',

            label_institution: 'Instituição:',
            label_fields: 'Áreas de pesquisa:',
            label_total_papers: 'Total publicações:',
            label_total_citations: 'Citações',
            label_h_index: 'Índice h',
            label_i10_index: 'Índice i10',

            unknown_institution: 'Instituição desconhecida',
            unknown_fields: 'Áreas desconhecidas',
            new_scholar: 'Novo pesquisador',
            paper_counter: 'publicações',

            access_via: 'via {domain}',
            last_updated: 'Última atualização: ',

            paper_changes_btn: 'Alterações ({count})',
            empty_state: 'Sem dados de autor<br><small>Insira a URL da página de autor do Google Scholar acima</small>',

            stats_summary: 'Monitorando {totalAuthors} pesquisadores, {totalPapers} publicações, {totalCitations} citações no total',
            stats_new_changes: '({count} com novas alterações)',

            paper_changes_title: '{name} - Alterações em citações ({count} publicações)',
            view_details: 'Ver detalhes',

            alert_invalid_url: 'Insira uma URL válida de página de autor do Google Scholar',
            alert_fetch_failed: 'Falha ao obter informações do autor: {error}',
            alert_no_authors: 'Nenhum autor para atualizar',
            alert_no_paper_changes: 'Sem alterações de citações para este autor',
            confirm_delete: 'Tem certeza de que deseja excluir este autor?',
            refresh_result: 'Atualização concluída! Sucesso: {success}, Falha: {fail}',
            refresh_failed_authors: 'Autores com falha: {names}',

            notify_installed: 'Extensão instalada. Monitoramento automático a cada 30 minutos',
            notify_error_title: 'Erro do Scholar Monitor',
            notify_refresh_failed: 'Falha na atualização automática: {error}',
            notify_citation_update: '🎉 Atualização de citações',
            notify_single_change: 'As citações de {name} aumentaram de {old} para {new} (+{increase})',
            notify_paper_changes_single: '{count} publicações com alterações de citações',
            notify_multi_citations: '{count} pesquisadores com {total} novas citações',
            notify_multi_papers: '{count} publicações com alterações de citações no total',
            notify_multi_title: '🎉 {count} pesquisadores atualizados'
        }
    },

    t(key, params = {}) {
        const langStrings = this.translations[this.currentLang] || this.translations['zh'];
        let text = langStrings[key] || this.translations['zh'][key] || key;
        Object.keys(params).forEach(param => {
            text = text.replace(new RegExp('\\{' + param + '\\}', 'g'), params[param]);
        });
        return text;
    },

    async getLanguage() {
        return new Promise(resolve => {
            try {
                chrome.storage.local.get(['language'], (result) => {
                    resolve(result.language || 'zh');
                });
            } catch (e) {
                resolve('zh');
            }
        });
    },

    async setLanguage(lang) {
        this.currentLang = lang;
        return new Promise(resolve => {
            try {
                chrome.storage.local.set({ language: lang }, resolve);
            } catch (e) {
                resolve();
            }
        });
    },

    getLocale() {
        return this.localeMap[this.currentLang] || 'zh-CN';
    }
};

// Make globally accessible for both popup (window) and background service worker (self)
if (typeof window !== 'undefined') {
    window.I18n = I18n;
    window.t = I18n.t.bind(I18n);
}
if (typeof self !== 'undefined') {
    self.I18n = I18n;
    self.t = I18n.t.bind(I18n);
}
