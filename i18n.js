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
            update_announcement_title: '🎉 v2.1.0 更新公告',
            update_announcement_body: '本次更新带来以下改进：<br><br><strong>🔗 引用者标题支持点击跳转</strong><br>之前"新增引用论文"列表里大部分条目只显示纯文本、无法点击。本次新增链接识别，<strong>优先跳转到论文真实发表页</strong>（arXiv / DOI / 出版社），无外链时跳 Scholar 详情页。论文变化列表里的论文标题也可点击跳转。<br><br><strong>🛡️ 引用明细基线防偏差</strong><br>修复 Google Scholar 偶发返回<strong>不完整引用列表</strong>时，系统把缺失的引用者<strong>误判为新增</strong>的问题。每次刷新会对本批次预热抓取做覆盖率统计，低于 60% 整批作废、下次重试。<br><br><strong>🔧 论文 ID 稳定匹配</strong><br>用 Scholar 内部稳定 ID 作为论文匹配主键（标题作 fallback），避免标题细微差异导致已预热的论文反复重新初始化。<br><br>💡 所有改进<strong>全自动</strong>，无需手动操作。',
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
            update_announcement_title: '🎉 v2.1.0 What\'s New',
            update_announcement_body: 'This update brings the following improvements:<br><br><strong>🔗 Citer Titles Are Now Clickable</strong><br>Previously, most entries in the "New Citing Papers" list were shown as plain text without links. Link recognition has been added — titles now <strong>jump to the paper\'s real publication page</strong> (arXiv / DOI / publisher) when available, falling back to the Scholar details page otherwise. Paper titles in the changes list are also clickable.<br><br><strong>🛡️ Citation Baseline Anti-Deviation</strong><br>Fixes an issue where Google Scholar occasionally returned <strong>incomplete citation lists</strong>, causing the system to <strong>false-flag missing citers as new</strong>. Each refresh now computes coverage stats across all warmup fetches in the batch — below 60% discards the whole batch and retries next time.<br><br><strong>🔧 Stable Paper ID Matching</strong><br>Uses Scholar\'s internal stable ID as the primary key for paper matching (falls back to title), preventing minor title differences from re-initializing already-warmed papers repeatedly.<br><br>💡 All improvements are <strong>fully automatic</strong>, no action needed.',
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
            update_announcement_title: '🎉 v2.1.0 Neuigkeiten',
            update_announcement_body: 'Dieses Update bringt die folgenden Verbesserungen:<br><br><strong>🔗 Zitierer-Titel sind nun klickbar</strong><br>Bisher wurden die meisten Einträge in der Liste „Neue zitierte Arbeiten" als reiner Text ohne Link angezeigt. Es wurde eine Link-Erkennung hinzugefügt — Titel springen nun <strong>zur echten Veröffentlichungsseite</strong> (arXiv / DOI / Verlag), wenn verfügbar, sonst zur Scholar-Detailseite. Auch Arbeitstitel in der Änderungsliste sind klickbar.<br><br><strong>🛡️ Anti-Abweichung der Zitations-Baseline</strong><br>Behebt ein Problem, bei dem Google Scholar gelegentlich <strong>unvollständige Zitationslisten</strong> zurückgab, wodurch das System <strong>fehlende Zitierer fälschlicherweise als neu markierte</strong>. Jede Aktualisierung berechnet nun Abdeckungsstatistiken über alle Warmup-Abrufe im Batch — unter 60 % wird der gesamte Batch verworfen und beim nächsten Mal wiederholt.<br><br><strong>🔧 Stabile Papier-ID-Zuordnung</strong><br>Verwendet Scholars interne stabile ID als Primärschlüssel für die Papierzuordnung (mit Fallback auf den Titel), um zu verhindern, dass bereits aufgewärmte Arbeiten aufgrund geringfügiger Titelunterschiede wiederholt neu initialisiert werden.<br><br>💡 Alle Verbesserungen sind <strong>vollautomatisch</strong>, kein Eingreifen erforderlich.',
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
            update_announcement_title: '🎉 v2.1.0 Nouveautés',
            update_announcement_body: 'Cette mise à jour apporte les améliorations suivantes :<br><br><strong>🔗 Les titres des citateurs sont désormais cliquables</strong><br>Auparavant, la plupart des entrées de la liste « Nouvelles publications citantes » s\'affichaient en texte simple sans lien. La reconnaissance de liens a été ajoutée — les titres sautent <strong>vers la vraie page de publication</strong> (arXiv / DOI / éditeur) quand c\'est possible, sinon vers la page de détails Scholar. Les titres d\'articles dans la liste des changements sont également cliquables.<br><br><strong>🛡️ Anti-déviation de la ligne de base des citations</strong><br>Corrige un problème où Google Scholar renvoyait parfois des <strong>listes de citations incomplètes</strong>, amenant le système à <strong>marquer à tort les citateurs manquants comme nouveaux</strong>. Chaque actualisation calcule désormais des statistiques de couverture sur tous les récupérations d\'échauffement du lot — en dessous de 60 %, tout le lot est annulé et réessayé au prochain passage.<br><br><strong>🔧 Correspondance stable par ID de publication</strong><br>Utilise l\'ID interne stable de Scholar comme clé primaire pour la correspondance (avec repli sur le titre), empêchant les publications déjà échauffées d\'être réinitialisées à plusieurs reprises en raison de différences mineures de titre.<br><br>💡 Toutes les améliorations sont <strong>entièrement automatiques</strong>, aucune action requise.',
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
            update_announcement_title: '🎉 v2.1.0 업데이트 소식',
            update_announcement_body: '이번 업데이트의 개선 사항:<br><br><strong>🔗 인용자 제목 클릭 가능</strong><br>이전에는 "신규 인용 논문" 목록의 대부분 항목이 링크 없는 일반 텍스트로 표시되었습니다. 이제 링크 인식이 추가되어, 제목 클릭 시 <strong>논문의 실제 출판 페이지</strong>(arXiv / DOI / 출판사)로 이동하며 외부 링크가 없을 때는 Scholar 상세 페이지로 이동합니다. 변화 목록의 논문 제목도 클릭 가능합니다.<br><br><strong>🛡️ 인용 기준선 편차 방지</strong><br>Google Scholar가 간혹 <strong>불완전한 인용 목록</strong>을 반환할 때 시스템이 <strong>누락된 인용자를 신규로 잘못 표시</strong>하는 문제를 수정합니다. 각 새로고침마다 배치의 모든 워밍업 페치에 대해 커버리지 통계를 계산하며, 60% 미만 시 전체 배치를 폐기하고 다음에 재시도합니다.<br><br><strong>🔧 안정적인 논문 ID 매칭</strong><br>Scholar의 내부 안정 ID를 논문 매칭 기본 키로 사용(제목으로 폴백)하여, 제목의 사소한 차이로 이미 워밍업된 논문이 반복적으로 재초기화되는 것을 방지합니다.<br><br>💡 모든 개선 사항은 <strong>완전 자동</strong>이며 조치가 필요 없습니다.',
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
            update_announcement_title: '🎉 v2.1.0 更新情報',
            update_announcement_body: '今回の更新の改善点:<br><br><strong>🔗 引用者タイトルがクリック可能に</strong><br>以前は「新規引用論文」リストのほとんどの項目がリンクのないプレーンテキストで表示されていました。今回リンク認識を追加し、利用可能な場合は<strong>論文の実際の公開ページ</strong>（arXiv / DOI / 出版者）にジャンプし、ない場合はScholar詳細ページにフォールバックします。変化リストの論文タイトルもクリック可能です。<br><br><strong>🛡️ 引用ベースラインの偏差防止</strong><br>Google Scholarが時折<strong>不完全な引用リスト</strong>を返す際、システムが<strong>欠落した引用者を新規と誤認</strong>する問題を修正します。各更新時にバッチ内のすべてのウォームアップ取得に対してカバレッジ統計を計算し、60%未満の場合はバッチ全体を破棄して次回再試行します。<br><br><strong>🔧 安定した論文IDマッチング</strong><br>Scholarの内部安定IDを論文マッチングの主キーとして使用（タイトルにフォールバック）し、タイトルのわずかな差異により既にウォームアップされた論文が繰り返し再初期化されるのを防ぎます。<br><br>💡 すべての改善は<strong>完全に自動</strong>で、操作は不要です。',
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
            update_announcement_title: '🎉 v2.1.0 Novedades',
            update_announcement_body: 'Esta actualización aporta las siguientes mejoras:<br><br><strong>🔗 Los títulos de citadores ahora son clicables</strong><br>Antes, la mayoría de las entradas en la lista «Nuevos artículos citantes» se mostraban como texto simple sin enlace. Se ha añadido reconocimiento de enlaces — los títulos ahora <strong>salto a la página real de publicación</strong> (arXiv / DOI / editorial) cuando está disponible, y si no, a la página de detalles de Scholar. Los títulos de artículos en la lista de cambios también son clicables.<br><br><strong>🛡️ Anti-desviación de la línea base de citas</strong><br>Corrige un problema donde Google Scholar a veces devolvía <strong>listas de citas incompletas</strong>, haciendo que el sistema <strong>marque erróneamente los citadores faltantes como nuevos</strong>. Cada actualización ahora calcula estadísticas de cobertura para todas las recuperaciones de calentamiento del lote — por debajo del 60 % descarta todo el lote y reintenta la próxima vez.<br><br><strong>🔧 Coincidencia estable por ID de artículo</strong><br>Usa el ID interno estable de Scholar como clave primaria para la coincidencia (con respaldo en el título), evitando que artículos ya calentados se reinicialicen repetidamente debido a diferencias menores de título.<br><br>💡 Todas las mejoras son <strong>totalmente automáticas</strong>, no se requiere ninguna acción.',
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
            update_announcement_title: '🎉 v2.1.0 Novidades',
            update_announcement_body: 'Esta atualização traz as seguintes melhorias:<br><br><strong>🔗 Títulos de citadores agora são clicáveis</strong><br>Antes, a maioria das entradas na lista «Novos artigos citantes» era mostrada como texto simples sem link. Foi adicionado o reconhecimento de links — os títulos agora <strong>saltam para a página real de publicação</strong> (arXiv / DOI / editora) quando disponível, e caso contrário para a página de detalhes do Scholar. Títulos de artigos na lista de mudanças também são clicáveis.<br><br><strong>🛡️ Anti-desvio da linha de base de citações</strong><br>Corrige um problema onde o Google Scholar às vezes retornava <strong>listas de citações incompletas</strong>, fazendo com que o sistema <strong>marcasse incorretamente citadores ausentes como novos</strong>. Cada atualização agora calcula estatísticas de cobertura para todas as buscas de aquecimento do lote — abaixo de 60 % descarta todo o lote e repete na próxima vez.<br><br><strong>🔧 Correspondência estável por ID de artigo</strong><br>Usa o ID interno estável do Scholar como chave primária para correspondência (com fallback para o título), evitando que artigos já aquecidos sejam reinicializados repetidamente devido a diferenças menores de título.<br><br>💡 Todas as melhorias são <strong>totalmente automáticas</strong>, nenhuma ação necessária.',
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
