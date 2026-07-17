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
            notify_multi_title: '🎉 {count} 位学者引用更新',

            // Citation history
            history_title: '📈 引用历史',
            history_empty: '暂无历史数据，刷新后开始记录',

            // Settings panel
            label_settings: '设置',
            label_language: '语言',
            label_show_history: '显示引用历史',
            label_citation_details: '追踪新增引用论文',
            new_citers_toggle: '新增引用论文 ({count})',
            no_citers_status: 'ℹ 暂无新增引用明细（{reason}）',
            reason_tracking_off: '未开启追踪',
            reason_author_off: '此作者未开启',
            reason_over_threshold: '引用数超过 100',
            reason_fetch_failed: '本次抓取失败，下次刷新会重试',
            reason_warmup: '基线预热中',
            reason_no_new: '本次无新增',

            // Warmup notice
            warmup_notice_title: '📌 关于引用明细追踪',
            warmup_notice_body: '已开启<strong>新增引用论文追踪</strong>。<br><br>为保证准确识别"新增"，系统需要先<strong>静默建立基线</strong>：<br>• <strong>第一次刷新</strong>：爬取每篇论文当前的引用者作为基线，<strong>不展示明细</strong><br>• <strong>第二次起</strong>：与基线对比，展示真正的新增引用论文<br><br><strong>仅追踪引用数 ≤ 100 的论文</strong>，超过的会自动跳过（避免触发 Google Scholar 反爬封号）。',
            warmup_notice_ok: '知道了',

            // Update announcement
            update_announcement_title: '🎉 更新公告',
            update_announcement_body: '本次更新带来以下新功能：<br><br><strong>🔍 新增引用论文追踪</strong><br>自动追踪哪些论文新引用了你的文章。<br>• <strong>自动建立基线</strong>：无需手动操作，开启后扩展会<strong>分批自动建立</strong>引用基线（每次刷新最多 15 篇，几小时内逐步完成）<br>• 引用数变化时展示具体新增引用者<br>• <strong>仅追踪引用数 ≤ 100 的论文</strong>（防反爬封号）<br><br><strong>📊 变化记录累加保留</strong><br>未点"已读"时，多次引用变化会<strong>累积显示总变化</strong>，7 天内有效。点"已读"才清空。<br><br><strong>📈 引用历史可视化</strong><br>每个作者卡片可展开查看引用数变化趋势图（7天/30天/90天/1年/全部）。<br><br><strong>⚠️ 反爬拦截提示</strong><br>当 Google Scholar 拦截抓取时，顶部横幅会引导你打开引用列表完成人机验证，点"已验证，立即重试"即可自动恢复。<br><br>在<strong>设置 ⚙</strong>里开启追踪。',
            update_announcement_ok: '知道了',

            // Anti-crawl banner
            anticrawl_title: '⚠️ Google Scholar 反爬限制',
            anticrawl_body: '扩展在抓取引用列表时被 Scholar 拦截。请在浏览器中打开下方链接，完成机器人验证后再次刷新——验证通过后扩展会自动恢复抓取。',
            anticrawl_open: '打开引用列表页',
            anticrawl_verified: '已验证，立即重试',
            anticrawl_dismiss: '关闭'
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
            notify_multi_title: '🎉 {count} Scholars Updated',

            // Citation history
            history_title: '📈 Citation History',
            history_empty: 'No history yet — will start recording after refresh',

            // Settings panel
            label_settings: 'Settings',
            label_language: 'Language',
            label_show_history: 'Show citation history',
            label_citation_details: 'Track new citing papers',
            new_citers_toggle: 'New citing papers ({count})',
            no_citers_status: 'ℹ No new citers ({reason})',
            reason_tracking_off: 'tracking off',
            reason_author_off: 'off for this author',
            reason_over_threshold: 'citations exceed 100',
            reason_fetch_failed: 'fetch failed, will retry next refresh',
            reason_warmup: 'baseline warming up',
            reason_no_new: 'none this refresh',

            // Warmup notice
            warmup_notice_title: '📌 About Citation Details Tracking',
            warmup_notice_body: '<strong>New citing papers tracking</strong> is now on.<br><br>To accurately identify "new" citers, the system first <strong>silently establishes a baseline</strong>:<br>• <strong>First refresh</strong>: crawls each paper\'s current citers as baseline, <strong>no details shown</strong><br>• <strong>From the second refresh</strong>: compares against baseline and shows genuinely new citing papers<br><br><strong>Only papers with ≤ 100 citations are tracked</strong> — higher-citation papers are skipped to avoid triggering Google Scholar\'s anti-bot blocking.',
            warmup_notice_ok: 'Got it',

            // Update announcement
            update_announcement_title: '🎉 What\'s New',
            update_announcement_body: 'New features in this update:<br><br><strong>🔍 New Citing Papers Tracking</strong><br>Automatically tracks which papers newly cite yours.<br>• <strong>Auto-builds baseline</strong>: no manual action needed, the extension <strong>builds the citation baseline in batches</strong> (max 15 per refresh, completes over a few hours)<br>• Shows specific new citers when citation counts change<br>• <strong>Only tracks papers with ≤100 citations</strong> (anti-bot protection)<br><br><strong>📊 Cumulative Change Records</strong><br>Multiple citation changes <strong>accumulate into a total change</strong> when not marked as read, visible within 7 days. Cleared only when you click "Mark as read".<br><br><strong>📈 Citation History Visualization</strong><br>Each author card can be expanded to show a citation trend chart (7D/30D/90D/1Y/All).<br><br><strong>⚠️ Anti-Bot Intercept Alert</strong><br>When Google Scholar blocks fetching, a top banner guides you to open the citation list and pass the robot check — click "Verified, retry now" to resume automatically.<br><br>Enable tracking in <strong>Settings ⚙</strong>.',
            update_announcement_ok: 'Got it',

            // Anti-crawl banner
            anticrawl_title: '⚠️ Google Scholar Anti-Bot Limit',
            anticrawl_body: 'The extension was blocked by Scholar while fetching the citation list. Open the link below, pass the robot check, then refresh — once verified, the extension resumes automatically.',
            anticrawl_open: 'Open citation list',
            anticrawl_verified: 'Verified, retry now',
            anticrawl_dismiss: 'Dismiss'
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
            notify_multi_title: '🎉 {count} Forscher aktualisiert',

            // Citation history
            history_title: '📈 Zitationsverlauf',
            history_empty: 'Noch keine Verlaufsdaten — Aufzeichnung nach Aktualisierung',

            // Settings panel
            label_settings: 'Einstellungen',
            label_language: 'Sprache',
            label_show_history: 'Zitationsverlauf anzeigen',
            label_citation_details: 'Neue zitierende Arbeiten verfolgen',
            new_citers_toggle: 'Neue zitierende Arbeiten ({count})',
            no_citers_status: 'ℹ Keine neuen Zitierer ({reason})',
            reason_tracking_off: 'Tracking deaktiviert',
            reason_author_off: 'für diesen Autor deaktiviert',
            reason_over_threshold: 'Zitationen über 100',
            reason_fetch_failed: 'Abruf fehlgeschlagen, beim nächsten Aktualisieren erneut versuchen',
            reason_warmup: 'Baseline wird erstellt',
            reason_no_new: 'keine in dieser Aktualisierung',

            // Warmup notice
            warmup_notice_title: '📌 Zur Nachverfolgung von Zitationsdetails',
            warmup_notice_body: '<strong>Nachverfolgung neuer zitierender Arbeiten</strong> ist aktiviert.<br><br>Für eine genaue Erkennung von „neu" muss zuerst eine <strong>Baseline</strong> aufgebaut werden:<br>• <strong>Erste Aktualisierung</strong>: crawlt die aktuellen Zitierer als Basislinie, <strong>keine Details angezeigt</strong><br>• <strong>Ab der zweiten Aktualisierung</strong>: Vergleich mit der Basislinie, zeigt wirklich neue zitierende Arbeiten<br><br><strong>Es werden nur Arbeiten mit ≤ 100 Zitationen verfolgt</strong> – darüber hinausgehende werden übersprungen, um eine Blockierung durch den Anti-Bot-Schutz von Google Scholar zu vermeiden.',
            warmup_notice_ok: 'Verstanden',

            // Update announcement
            update_announcement_title: '🎉 Neuigkeiten',
            update_announcement_body: 'Neue Funktionen in diesem Update:<br><br><strong>🔍 Nachverfolgung neuer zitierender Arbeiten</strong><br>Verfolgt automatisch, welche Arbeiten neu zitiert haben.<br>• <strong>Baseline wird automatisch erstellt</strong>: kein manueller Eingriff nötig, die Erweiterung <strong>erstellt die Zitations-Baseline in Chargen</strong> (max. 15 pro Aktualisierung, Abschluss nach einigen Stunden)<br>• Zeigt die spezifischen neuen Zitierer an, wenn sich die Zitationsanzahl ändert<br>• <strong>Nur Arbeiten mit ≤100 Zitationen</strong> (Anti-Bot-Schutz)<br><br><strong>📊 Kumulative Änderungsaufzeichnungen</strong><br>Mehrere Zitationsänderungen <strong>summieren sich zu einer Gesamtänderung</strong>, solange sie nicht als gelesen markiert sind, sichtbar innerhalb von 7 Tagen. Erst beim Klick auf „Gelesen markieren" wird geleert.<br><br><strong>📈 Zitationsverlauf-Visualisierung</strong><br>Jede Autorenkarte lässt sich aufklappen, um ein Zitationstrenddiagramm anzuzeigen (7T/30T/90T/1J/Alle).<br><br><strong>⚠️ Anti-Bot-Sperrhinweis</strong><br>Wenn Google Scholar den Abruf blockiert, führt ein Banner oben zum Öffnen der Zitationsliste und Bestehen der Roboter-Prüfung – auf „Verifiziert, jetzt erneut versuchen" klicken, um automatisch fortzufahren.<br><br>In <strong>Einstellungen ⚙</strong> aktivieren.',
            update_announcement_ok: 'Verstanden',

            // Anti-crawl banner
            anticrawl_title: '⚠️ Google Scholar Anti-Bot-Sperre',
            anticrawl_body: 'Die Erweiterung wurde beim Abruf der Zitationsliste von Scholar blockiert. Öffnen Sie den Link unten, bestehen Sie die Roboter-Prüfung und aktualisieren Sie danach — nach Verifizierung setzt die Erweiterung automatisch fort.',
            anticrawl_open: 'Zitationsliste öffnen',
            anticrawl_verified: 'Verifiziert, jetzt erneut versuchen',
            anticrawl_dismiss: 'Schließen'
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
            notify_multi_title: '🎉 {count} chercheurs mis à jour',

            // Citation history
            history_title: '📈 Historique des citations',
            history_empty: 'Pas encore d\'historique — enregistré après actualisation',

            // Settings panel
            label_settings: 'Paramètres',
            label_language: 'Langue',
            label_show_history: 'Afficher l\'historique des citations',
            label_citation_details: 'Suivre les nouvelles publications citantes',
            new_citers_toggle: 'Nouvelles publications citantes ({count})',
            no_citers_status: 'ℹ Aucun nouveau citant ({reason})',
            reason_tracking_off: 'suivi désactivé',
            reason_author_off: 'désactivé pour cet auteur',
            reason_over_threshold: 'citations supérieures à 100',
            reason_fetch_failed: "échec de récupération, réessayé à la prochaine actualisation",
            reason_warmup: 'ligne de base en cours',
            reason_no_new: 'aucun lors de cette actualisation',

            // Warmup notice
            warmup_notice_title: '📌 À propos du suivi des citations',
            warmup_notice_body: 'Le <strong>suivi des nouvelles publications citantes</strong> est activé.<br><br>Pour identifier correctement les « nouvelles », le système doit d\'abord <strong>créer une base de référence silencieuse</strong> :<br>• <strong>Première actualisation</strong> : récupère les citateurs actuels comme base de référence, <strong>aucun détail affiché</strong><br>• <strong>À partir de la deuxième</strong> : compare avec la base et affiche les véritables nouvelles publications citantes<br><br><strong>Seules les publications avec ≤ 100 citations sont suivies</strong> — les autres sont ignorées pour éviter le blocage anti-bot de Google Scholar.',
            warmup_notice_ok: 'Compris',

            // Update announcement
            update_announcement_title: '🎉 Nouveautés',
            update_announcement_body: 'Nouveautés de cette mise à jour :<br><br><strong>🔍 Suivi des nouvelles publications citantes</strong><br>Suit automatiquement les publications qui ont nouvellement cité les vôtres.<br>• <strong>Création automatique de la ligne de base</strong> : aucune action manuelle requise, l\'extension <strong>crée la ligne de base de citation par lots</strong> (max. 15 par actualisation, se termine en quelques heures)<br>• Affiche les nouveaux citateurs spécifiques lorsque le nombre de citations change<br>• <strong>Suit uniquement les publications avec ≤100 citations</strong> (protection anti-bot)<br><br><strong>📊 Enregistrements cumulatifs des changements</strong><br>Plusieurs changements de citations <strong>s\'accumulent en un changement total</strong> tant qu\'ils ne sont pas marqués comme lus, visibles pendant 7 jours. Effacés uniquement lorsque vous cliquez sur « Marquer comme lu ».<br><br><strong>📈 Visualisation de l\'historique des citations</strong><br>Chaque carte d\'auteur peut être dépliée pour afficher un graphique de tendance des citations (7j/30j/90j/1an/Tous).<br><br><strong>⚠️ Alerte de blocage anti-bot</strong><br>Lorsque Google Scholar bloque la récupération, une bannière en haut vous guide pour ouvrir la liste des citations et réussir la vérification robot — cliquez sur « Vérifié, réessayer » pour reprendre automatiquement.<br><br>Activer dans <strong>Paramètres ⚙</strong>.',
            update_announcement_ok: 'Compris',

            // Anti-crawl banner
            anticrawl_title: '⚠️ Blocage anti-bot Google Scholar',
            anticrawl_body: 'L\'extension a été bloquée par Scholar lors de la récupération de la liste des citations. Ouvrez le lien ci-dessous, réussissez la vérification robot, puis actualisez — une fois vérifiée, l\'extension reprend automatiquement.',
            anticrawl_open: 'Ouvrir la liste des citations',
            anticrawl_verified: 'Vérifié, réessayer',
            anticrawl_dismiss: 'Fermer'
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
            notify_multi_title: '🎉 {count}명 학자 업데이트',

            // Citation history
            history_title: '📈 인용 이력',
            history_empty: '아직 이력 없음 — 새로고침 후 기록 시작',

            // Settings panel
            label_settings: '설정',
            label_language: '언어',
            label_show_history: '인용 이력 표시',
            label_citation_details: '신규 인용 논문 추적',
            new_citers_toggle: '신규 인용 논문 ({count})',
            no_citers_status: 'ℹ 신규 인용 없음 ({reason})',
            reason_tracking_off: '추적 꺼짐',
            reason_author_off: '이 저자 꺼짐',
            reason_over_threshold: '인용수 100 초과',
            reason_fetch_failed: '가져오기 실패, 다음 새로고침에 재시도',
            reason_warmup: '기준선 구축 중',
            reason_no_new: '이번 회차 없음',

            // Warmup notice
            warmup_notice_title: '📌 인용 세부 추적에 대하여',
            warmup_notice_body: '<strong>신규 인용 논문 추적</strong>이 활성화되었습니다.<br><br>"신규"를 정확히 식별하기 위해 먼저 <strong>조용히 기준선을 구축</strong>합니다:<br>• <strong>첫 새로고침</strong>: 각 논문의 현재 인용자를 기준선으로 크롤링, <strong>세부 정보 표시 안 함</strong><br>• <strong>두 번째부터</strong>: 기준선과 비교하여 실제 신규 인용 논문 표시<br><br><strong>인용 수가 100 이하인 논문만 추적</strong>합니다. 그 이상은 Google Scholar의 봇 차단을 방지하기 위해 건너뜁니다.',
            warmup_notice_ok: '확인',

            // Update announcement
            update_announcement_title: '🎉 업데이트 소식',
            update_announcement_body: '이번 업데이트의 새로운 기능:<br><br><strong>🔍 신규 인용 논문 추적</strong><br>어떤 논문이 새로 인용했는지 자동으로 추적합니다.<br>• <strong>자동 기준선 구축</strong>: 수동 조작 불필요, 확장 프로그램이<strong>인용 기준선을 배치로 구축</strong>합니다 (새로고침당 최대 15편, 몇 시간에 걸쳐 완료)<br>• 인용 수 변화 시 구체적인 신규 인용자 표시<br>• <strong>인용 수 100 이하인 논문만 추적</strong> (봇 차단 방지)<br><br><strong>📊 변화 기록 누적</strong><br>"읽음"으로 표시하지 않으면 여러 인용 변화가 <strong>총 변화로 누적</strong>되어 7일 이내에 표시됩니다. "읽음으로 표시"를 클릭할 때만 삭제됩니다.<br><br><strong>📈 인용 이력 시각화</strong><br>각 저자 카드를 펼쳐 인용 추세 그래프를 볼 수 있습니다 (7일/30일/90일/1년/전체).<br><br><strong>⚠️ 봇 차단 감지 알림</strong><br>Google Scholar가 수집을 차단하면 상단 배너가 인용 목록을 열고 로봇 확인을 통과하도록 안내합니다. "인증 완료, 다시 시도"를 클릭하면 자동으로 재개됩니다.<br><br><strong>설정 ⚙</strong>에서 추적을 활성화하세요.',
            update_announcement_ok: '확인',

            // Anti-crawl banner
            anticrawl_title: '⚠️ Google Scholar 봇 차단',
            anticrawl_body: '인용 목록을 가져오는 중 확장 프로그램이 Scholar에 차단되었습니다. 아래 링크를 열어 로봇 확인을 통과한 후 새로고침하세요. 인증 완료 후 확장 프로그램이 자동으로 다시 시작됩니다.',
            anticrawl_open: '인용 목록 열기',
            anticrawl_verified: '인증 완료, 다시 시도',
            anticrawl_dismiss: '닫기'
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
            notify_multi_title: '🎉 {count}名の研究者がアップデート',

            // Citation history
            history_title: '📈 引用履歴',
            history_empty: 'まだ履歴なし — 更新後に記録を開始',

            // Settings panel
            label_settings: '設定',
            label_language: '言語',
            label_show_history: '引用履歴を表示',
            label_citation_details: '新規引用論文を追跡',
            new_citers_toggle: '新規引用論文 ({count})',
            no_citers_status: 'ℹ 新規引用なし ({reason})',
            reason_tracking_off: '追跡オフ',
            reason_author_off: 'この著者はオフ',
            reason_over_threshold: '引用数100超過',
            reason_fetch_failed: '取得失敗、次回の更新で再試行',
            reason_warmup: 'ベースライン構築中',
            reason_no_new: '今回なし',

            // Warmup notice
            warmup_notice_title: '📌 引用詳細の追跡について',
            warmup_notice_body: '<strong>新規引用論文の追跡</strong>が有効になりました。<br><br>「新規」を正確に識別するため、まず<strong>サイレントに基準値を確立</strong>します：<br>• <strong>初回更新</strong>: 各論文の現在の引用者を基準値として取得、<strong>詳細は表示しない</strong><br>• <strong>2回目以降</strong>: 基準値と比較し、真の新規引用論文を表示<br><br><strong>引用数 100 以下の論文のみ追跡</strong>します。それ以上は Google Scholar のボット対策ブロックを回避するためスキップします。',
            warmup_notice_ok: '了解',

            // Update announcement
            update_announcement_title: '🎉 更新情報',
            update_announcement_body: '今回の更新の新機能:<br><br><strong>🔍 新規引用論文の追跡</strong><br>どの論文が新しく引用したかを自動的に追跡します。<br>• <strong>自動でベースラインを構築</strong>: 手動操作不要、拡張機能が<strong>バッチ単位で引用ベースラインを構築</strong>します（1回の更新あたり最大15件、数時間で完了）<br>• 引用数の変化時に具体的な新規引用者を表示<br>• <strong>引用数100以下の論文のみ追跡</strong>（ボット対策）<br><br><strong>📊 変化記録の累積</strong><br>「既読にする」まで複数の引用変化が<strong>合計変化として累積</strong>され、7日以内に表示されます。「既読にする」をクリックした場合のみクリアされます。<br><br><strong>📈 引用履歴の可視化</strong><br>各著者カードを展開して引用推移グラフを表示できます（7日/30日/90日/1年/全期間）。<br><br><strong>⚠️ アンチボット遮断アラート</strong><br>Google Scholarが取得をブロックした際、上部のバナーが引用リストを開きロボット認証を案内します。「認証完了、今すぐ再試行」をクリックすると自動的に再開します。<br><br><strong>設定 ⚙</strong>で追跡を有効化。',
            update_announcement_ok: '了解',

            // Anti-crawl banner
            anticrawl_title: '⚠️ Google Scholar アンチボット制限',
            anticrawl_body: '引用リストの取得中に拡張機能が Scholar にブロックされました。下のリンクを開いてロボット認証を完了し、再度更新してください。認証完了後、拡張機能は自動的に再開します。',
            anticrawl_open: '引用リストを開く',
            anticrawl_verified: '認証完了、今すぐ再試行',
            anticrawl_dismiss: '閉じる'
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
            notify_multi_title: '🎉 {count} investigadores actualizados',

            // Citation history
            history_title: '📈 Historial de citas',
            history_empty: 'Aún sin historial — se registrará tras actualizar',

            // Settings panel
            label_settings: 'Ajustes',
            label_language: 'Idioma',
            label_show_history: 'Mostrar historial de citas',
            label_citation_details: 'Rastrear nuevos artículos citantes',
            new_citers_toggle: 'Nuevos artículos citantes ({count})',
            no_citers_status: 'ℹ Sin nuevos citantes ({reason})',
            reason_tracking_off: 'seguimiento desactivado',
            reason_author_off: 'desactivado para este autor',
            reason_over_threshold: 'citas superan 100',
            reason_fetch_failed: 'error al obtener, se reintentará en la próxima actualización',
            reason_warmup: 'creando línea base',
            reason_no_new: 'ninguno en esta actualización',

            // Warmup notice
            warmup_notice_title: '📌 Sobre el seguimiento de citas',
            warmup_notice_body: 'El <strong>seguimiento de nuevos artículos citantes</strong> está activado.<br><br>Para identificar correctamente los «nuevos», el sistema primero <strong>establece silenciosamente una línea base</strong>:<br>• <strong>Primera actualización</strong>: recopila los citadores actuales como línea base, <strong>sin mostrar detalles</strong><br>• <strong>Desde la segunda</strong>: compara con la línea base y muestra los verdaderos nuevos artículos citantes<br><br><strong>Solo se rastrean artículos con ≤ 100 citas</strong> — los de mayor número de citas se omiten para evitar el bloqueo anti-bot de Google Scholar.',
            warmup_notice_ok: 'Entendido',

            // Update announcement
            update_announcement_title: '🎉 Novedades',
            update_announcement_body: 'Novedades en esta actualización:<br><br><strong>🔍 Seguimiento de nuevos artículos citantes</strong><br>Rastrea automáticamente qué artículos citan los suyos recientemente.<br>• <strong>Línea base automática</strong>: no se necesita acción manual, la extensión <strong>construye la línea base de citas por lotes</strong> (máx. 15 por actualización, se completa en unas horas)<br>• Muestra los nuevos citadores específicos cuando cambia el número de citas<br>• <strong>Solo rastrea artículos con ≤100 citas</strong> (protección anti-bot)<br><br><strong>📊 Registros acumulativos de cambios</strong><br>Múltiples cambios de citas <strong>se acumulan en un cambio total</strong> mientras no se marquen como leídos, visibles durante 7 días. Se borran únicamente al hacer clic en «Marcar como leído».<br><br><strong>📈 Visualización del historial de citas</strong><br>Cada tarjeta de autor se puede expandir para mostrar un gráfico de tendencia de citas (7d/30d/90d/1a/Todos).<br><br><strong>⚠️ Alerta de bloqueo anti-bot</strong><br>Cuando Google Scholar bloquea la obtención, un banner en la parte superior te guía para abrir la lista de citas y superar la verificación de robot — haz clic en «Verificado, reintentar» para reanudar automáticamente.<br><br>Activar en <strong>Ajustes ⚙</strong>.',
            update_announcement_ok: 'Entendido',

            // Anti-crawl banner
            anticrawl_title: '⚠️ Bloqueo anti-bot de Google Scholar',
            anticrawl_body: 'La extensión fue bloqueada por Scholar al obtener la lista de citas. Abre el enlace siguiente, completa la verificación robot y actualiza; una vez verificado, la extensión se reanuda automáticamente.',
            anticrawl_open: 'Abrir lista de citas',
            anticrawl_verified: 'Verificado, reintentar',
            anticrawl_dismiss: 'Cerrar'
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
            notify_multi_title: '🎉 {count} pesquisadores atualizados',

            // Citation history
            history_title: '📈 Histórico de citações',
            history_empty: 'Ainda sem histórico — registrado após atualização',

            // Settings panel
            label_settings: 'Configurações',
            label_language: 'Idioma',
            label_show_history: 'Mostrar histórico de citações',
            label_citation_details: 'Rastrear novos artigos citantes',
            new_citers_toggle: 'Novos artigos citantes ({count})',
            no_citers_status: 'ℹ Sem novos citantes ({reason})',
            reason_tracking_off: 'rastreamento desativado',
            reason_author_off: 'desativado para este autor',
            reason_over_threshold: 'citações acima de 100',
            reason_fetch_failed: 'falha ao buscar, será tentado na próxima atualização',
            reason_warmup: 'criando linha de base',
            reason_no_new: 'nenhum nesta atualização',

            // Warmup notice
            warmup_notice_title: '📌 Sobre o rastreamento de citações',
            warmup_notice_body: 'O <strong>rastreamento de novos artigos citantes</strong> está ativado.<br><br>Para identificar corretamente os «novos», o sistema primeiro <strong>estabelece silenciosamente uma linha de base</strong>:<br>• <strong>Primeira atualização</strong>: coleta os citadores atuais como linha de base, <strong>sem mostrar detalhes</strong><br>• <strong>A partir da segunda</strong>: compara com a linha de base e mostra os verdadeiros novos artigos citantes<br><br><strong>Apenas artigos com ≤ 100 citações são rastreados</strong> — os demais são ignorados para evitar o bloqueio anti-bot do Google Scholar.',
            warmup_notice_ok: 'Entendi',

            // Update announcement
            update_announcement_title: '🎉 Novidades',
            update_announcement_body: 'Novidades nesta atualização:<br><br><strong>🔍 Rastreamento de novos artigos citantes</strong><br>Rastreia automaticamente quais artigos citaram os seus recentemente.<br>• <strong>Linha de base automática</strong>: sem ação manual necessária, a extensão <strong>constrói a linha de base de citações em lotes</strong> (máx. 15 por atualização, concluído em algumas horas)<br>• Mostra os novos citantes específicos quando o número de citações muda<br>• <strong>Rastreia apenas artigos com ≤100 citações</strong> (proteção anti-bot)<br><br><strong>📊 Registros cumulativos de alterações</strong><br>Múltiplas alterações de citações <strong>acumulam-se em uma alteração total</strong> enquanto não forem marcadas como lidas, visíveis por 7 dias. Limpo apenas ao clicar em «Marcar como lido».<br><br><strong>📈 Visualização do histórico de citações</strong><br>Cada cartão de autor pode ser expandido para mostrar um gráfico de tendência de citações (7d/30d/90d/1a/Todos).<br><br><strong>⚠️ Alerta de bloqueio anti-bot</strong><br>Quando o Google Scholar bloqueia a busca, um banner no topo orienta a abrir a lista de citações e passar na verificação de robô — clique em «Verificado, tentar novamente» para retomar automaticamente.<br><br>Ativar em <strong>Configurações ⚙</strong>.',
            update_announcement_ok: 'Entendi',

            // Anti-crawl banner
            anticrawl_title: '⚠️ Bloqueio anti-bot do Google Scholar',
            anticrawl_body: 'A extensão foi bloqueada pelo Scholar ao obter a lista de citações. Abra o link abaixo, conclua a verificação de robot e atualize — após verificado, a extensão retoma automaticamente.',
            anticrawl_open: 'Abrir lista de citações',
            anticrawl_verified: 'Verificado, tentar novamente',
            anticrawl_dismiss: 'Fechar'
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

    detectBrowserLanguage() {
        try {
            const uiLang = (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage)
                ? chrome.i18n.getUILanguage()
                : (navigator.language || 'zh');
            const short = uiLang.split('-')[0].toLowerCase();
            const supported = ['zh', 'en', 'de', 'fr', 'ko', 'ja', 'es', 'pt'];
            return supported.includes(short) ? short : 'zh';
        } catch (e) {
            return 'zh';
        }
    },

    async getLanguage() {
        return new Promise(resolve => {
            try {
                chrome.storage.local.get(['language'], (result) => {
                    resolve(result.language || this.detectBrowserLanguage());
                });
            } catch (e) {
                resolve(this.detectBrowserLanguage());
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
