// ==UserScript==
// @name         Booru Tag Sorter Exporter NAI Edition
// @namespace    https://github.com/Takenoko3333/Danbooru-Tags-Sort-Exporter
// @supportURL   https://github.com/Takenoko3333/Danbooru-Tags-Sort-Exporter/issues
// @homepageURL  https://github.com/Takenoko3333/Danbooru-Tags-Sort-Exporter
// @require      https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @version      0.9.0
// @description  Selects, sorts and exports tags from *booru posts to your clipboard, ready to be pasted in your local UI or NovelAI.
// @author       Original by FSpark, forked by Takenoko3333, NAI enhancements by JapariAnon
// @match        https://danbooru.donmai.us/posts/*
// @match        https://aibooru.online/posts/*
// @match        https://betabooru.donmai.us/posts/*
// @match        https://e621.net/posts/*
// @match        https://gelbooru.com/index.php?page=post&s=view*
// @match        https://rule34.xxx/index.php?page=post&s=view*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=donmai.us
// @grant        GM.setClipboard
// @grant        GM.notification
// @grant        GM.addStyle
// @license      AGPL-3.0
// @downloadURL https://github.com/JapariAnon/Booru-Tag-Sorter-Exporter-NAI-Edition/raw/refs/heads/main/Booru-Tag-Sorter-Exporter-NAI-Edition.user.js
// @updateURL https://github.com/JapariAnon/Booru-Tag-Sorter-Exporter-NAI-Edition/raw/refs/heads/main/Booru-Tag-Sorter-Exporter-NAI-Edition.user.js
// ==/UserScript==

// Forked from FSpark/Danbooru-Tags-Exporter(https://github.com/FSpark/Danbooru-Tags-Exporter) and Takenoko3333/Danbooru-Tags-Exporter(https://github.com/Takenoko3333/Danbooru-Tags-Sort-Exporter)

(function () {
    'use strict';

    // Settings changed on the web page are saved to local storage and applied when revisiting.
    // ウェブページ上で変更した設定はローカルストレージに保存され、再訪時に適用されます。

    // ==Settings==
    const initialSettings = {
        sort: true, // Sorted by tag order in NovelAI method. (タグをNovelAI方式で並び替える)
        bracketEscape: false, // true: Stable Diffusion, false: NovelAI
        setWeight: false, // true: Show and Activate weight inputs. (ウェイト入力の表示と有効化)
        useBracket: 1, // 0: ( ) Stable Diffusion, 1: { } NovelAI, 2: NovelAI NegPiP (:: syntax)
        selections: {artist: true, copyright: true, character: true, species: true, general: true} // Pre-checked state for each category. (カテゴリ毎の初期選択状態)
    };
    // ==/Settings==

    let settings = {};
    let localSettings = JSON.parse(localStorage.getItem("settings")) || {};
    for (let key in initialSettings) {
        if (localSettings[key] === undefined) {
            settings[key] = initialSettings[key];
        } else {
            settings[key] = localSettings[key];
        }
    }
    localStorage.setItem("settings", JSON.stringify(settings));
    // console.log(settings)

    let sortCheck = "";
    let bracketEscapeCheck = "";
    let setWeightCheck = "";
    let roundBracketsRadio = "";
    let curlyBracketsRadio = "";
    let negpipRadio = "";
    let selectArtistCheck = "";
    let selectCopyrightCheck = "";
    let selectCharacterCheck = "";
    let selectSpeciesCheck = "";
    let selectGeneralCheck = "";

    if(settings.sort) {
        sortCheck = "checked";
    }
    if(settings.bracketEscape) {
        bracketEscapeCheck = "checked";
    }
    if(settings.setWeight) {
        setWeightCheck = "checked";
    }
    if(parseInt(settings.useBracket) === 2) {
        negpipRadio = "checked";
    } else if(parseInt(settings.useBracket) === 1) {
        curlyBracketsRadio = "checked";
    } else {
        roundBracketsRadio = "checked";
    }
    if(settings.selections) {
        if(settings.selections.artist) {
            selectArtistCheck = "checked";
        }
        if(settings.selections.copyright) {
            selectCopyrightCheck = "checked";
        }
        if(settings.selections.character) {
            selectCharacterCheck = "checked";
        }
        if(settings.selections.species) {
            selectSpeciesCheck = "checked";
        }
        if(settings.selections.general) {
            selectGeneralCheck = "checked";
        }
    }

    let isRule34 = location.hostname == "rule34.xxx";
    let tagListSelector = isRule34 ? "#tag-sidebar" : "#tag-list";

    GM.addStyle(`#tags-exporter-setting {box-sizing: border-box; padding: .5em .75em .6em .75em; margin-bottom: .75em; border: 1px solid rgba(128,128,128,.4); border-radius: .4em;}
                 #tags-exporter-setting button, ${tagListSelector} button {margin: 0.25rem 0 0.5rem 0; padding: 0.25em 0.55em;}
                 #tags-exporter-setting button#reset-settings {margin-top: .65em}
                 #tags-exporter-setting h2 {margin: .1em 0 .45em 0;}
                 #tags-exporter-setting label {display: inline-block; padding: .1em .25em; line-height: 1.5em; font-weight: normal;}
                 #tags-exporter-setting label[title] {cursor: help; text-decoration: underline dotted rgba(128,128,128,.55); text-underline-offset: 2px;}
                 #tags-exporter-setting .heading {margin-top: .6em; margin-bottom: .15em; line-height: 1.5em; font-weight: bold; border-bottom: 1px solid rgba(128,128,128,.35);}
                 #tags-exporter-setting .setting-row {display: inline-flex; align-items: baseline; margin: .15em 0;}
                 #tags-exporter-setting .use-bracket .setting-row {white-space: nowrap; align-items: center;}
                 #tags-exporter-setting .prechecked {display: grid; grid-template-columns: 1fr 1fr; column-gap: .4em; font-size: .92em;}
                 #tags-exporter-setting .inline-checkbox {display: inline-flex; align-items: center; white-space: nowrap; margin: .15em 0; padding: 0 .25em;}
                 #tags-exporter-setting .use-bracket {display: flex; flex-wrap: wrap; align-items: center; column-gap: 1.1em; row-gap: .3em; margin: .35em 0 .25em 1.4em;}
                 ${tagListSelector} input[type='checkbox'] {margin-right: .4em; vertical-align: text-bottom;}
                 #tags-exporter-setting input[type='checkbox'], #tags-exporter-setting input[type='radio'] {margin: 0 .35em 0 0; vertical-align: middle;}
                 .tag-weight {width: 3em; margin-right: .4em}
                 body.negpip-mode .tag-weight {width: 4.5em;}
                `);

    if (location.hostname == "gelbooru.com") {
        GM.addStyle(`#tags-exporter-setting {margin: 0 10px 0 25px;}
                     #tags-exporter-setting h2 {font-size: 1.2em;}
                     #tags-exporter-setting .heading {font-weight: bold}
                     #tags-exporter-setting button,  ${tagListSelector} button {padding: 0.25em 0.4em;}
                     [id$="-tag-buttons"] {margin: 0 4px 0 15px;}
                     .tag-weight {width: 2.5em;}
                    `);
    }

    if (location.hostname == "rule34.xxx") {
        GM.addStyle(`#tags-exporter-setting {margin: 10px 0;}
                     #tags-exporter-setting h2 {font-size: 1.2em;}
                     #tags-exporter-setting .heading {font-weight: bold}
                     #tags-exporter-setting button,  ${tagListSelector} button {padding: 0.25em 0.4em;}
                     #tags-exporter-setting input, [class^="tag-type-"] input {margin: 0;}
                     input.tag-weight {width: 2.5em; padding: 0 0 0 .1em;}
                     ${tagListSelector} h6 {margin-top: 13px;}
                    `);

        for (let i = 0; i < document.styleSheets.length; i++) {
            let href = document.styleSheets[i].href;
            if (href) {
                let fileName = href.split('/').pop();
                if (fileName.startsWith('mobile.css')) {
                    GM.addStyle(`#tags-exporter-setting {text-align: center;}
                     #tags-exporter-setting input, ${tagListSelector} input[type='checkbox'] {height: 27px; vertical-align: middle; transform: scale(1.5);}
                     #tags-exporter-setting input {margin: 0 0.2em}
                     ${tagListSelector} input[type='checkbox'] {margin-right: 0.6em;}
                     #tags-exporter-setting .use-bracket {margin-left: 0;}
                    `);
                }
            }
        }
    }

    if (location.hostname != "e621.net") {
        GM.addStyle(`#tags-exporter-setting .show-e621 {display: none;}
                    `);
    }

    if (location.hostname == "e621.net") {
        GM.addStyle(`#tags-exporter-setting h2 {font-size: 1.16667em;}
                     #tags-exporter-setting .show-e621 {display: inline-flex;}
                     .tag-list-header {margin-bottom: 2px;}
                     ul + .tag-list-header {margin-top: 8px;}
                     .tag-weight {width: 2.5em; padding: 1px;}
                    `);
    }

    let SettingPanel = document.createElement('section');
    SettingPanel.id = "tags-exporter-setting";
    SettingPanel.innerHTML = `
        <h2>Tags Export Settings</h2>
        <span class="setting-row"><input type="checkbox" id="sort" ${sortCheck}/><label for="sort" title="Sorts tags by NovelAI's suggested order of amount of subjects > character(s) > copyright > artist(s) and adds their relevant meta prefixes">NovelAI ordering &amp; meta prefixes</label></span>
        <span class="setting-row"><input type="checkbox" id="bracket-escape" ${bracketEscapeCheck}/><label for="bracket-escape"><code>(</code> <code>)</code> -> <code>\\(</code> <code>\\)</code></label></span>
        <span class="setting-row"><input type="checkbox" id="set-weight"  ${setWeightCheck}/><label for="set-weight">Setting weights</label></span>
        <div class="use-bracket">
        <span class="setting-row"><input type="radio" name="use_bracket" id="round-brackets" value="0" ${roundBracketsRadio}/><label for="round-brackets">Using ( )</label></span>
        <span class="setting-row"><input type="radio" name="use_bracket" id="curly-brackets" value="1" ${curlyBracketsRadio}/><label for="curly-brackets">Using { }</label></span>
        <span class="setting-row"><input type="radio" name="use_bracket" id="negpip-syntax" value="2" ${negpipRadio}/><label for="negpip-syntax" title="Uses NovelAI's NegPiP :: syntax to set tag weights. Only gets emitted for tags with weight differing from 1, except for artist tags where it always gets emitted for convenience.">NovelAI NegPiP</label></span>
        </div>
        <div class="prechecked">
        <div class="heading" style="grid-column: 1 / -1;">Pre-checked</div>
        <span class="inline-checkbox"><input type="checkbox" id="select-artist" ${selectArtistCheck}/><label for="select-artist">Artist</label></span>
        <span class="inline-checkbox"><input type="checkbox" id="select-copyright" ${selectCopyrightCheck}/><label for="select-copyright">Copyright</label></span>
        <span class="inline-checkbox"><input type="checkbox" id="select-character" ${selectCharacterCheck}/><label for="select-character">Character</label></span>
        <span class="inline-checkbox show-e621"><input type="checkbox" id="select-species" ${selectGeneralCheck}/><label for="select-species">Species</label></span>
        <span class="inline-checkbox"><input type="checkbox" id="select-general" ${selectGeneralCheck}/><label for="select-general">General</label></span>
        </div>
        <button name="reset_settings" id="reset-settings">Settings Reset</button>
        `
	let Container = document.createElement('div');
    Container.id = "tags-exporter-container";
    Container.innerHTML = `
        <button name="select_all">All</button>
        <button name="select_none">None</button>
        <button name="invert_select">Invert</button>
        <button name="export">Export</button>
        `

    function insertBefore(newNode, referenceNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode);
    }

    function insertAfter(newNode, referenceNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    }

    if (location.hostname == "gelbooru.com" || location.hostname == "rule34.xxx") {
        insertBefore(SettingPanel, document.querySelector(tagListSelector));
    } else {
        insertAfter(SettingPanel, document.querySelector("#search-box"));
    }
    insertAfter(Container, document.querySelector("#tags-exporter-setting > h2"));

    function addBrackets(prompts,isRound,n){
        let l,r;
        if(n==0) {
            return prompts
        }
        else if(n>0){
            if(isRound){
                l='('
                r=')'}
            else{
                l='{'
                r='}'
            }
        }else{
            l='['
            r=']'
        }
        n=Math.abs(n)
        return l.repeat(n).concat(prompts,r.repeat(n))
    }
function exportTags(target){
    let tags = [];
    let reorderedTags = [];
    let sort = document.getElementById("sort").checked;
    let bracket_escape = document.getElementById("bracket-escape").checked;
    let set_weight = document.getElementById("set-weight").checked;
    let use_bracket = parseInt(document.querySelector("input[name='use_bracket']:checked").value);

    function addBrackets(prompts, isRound, n){
        let l, r;
        if(n == 0) {
            return prompts;
        } else if(n > 0) {
            if(isRound){
                l = '(';
                r = ')';
            } else {
                l = '{';
                r = '}';
            }
        } else {
            l = '[';
            r = ']';
        }
        n = Math.abs(n);
        return l.repeat(n).concat(prompts, r.repeat(n));
    }

    function addPrefix(tag, prefix) {
    return prefix ? `${prefix}:${tag}` : tag;

    }

    function formatNegpipWeight(w) {
        return parseFloat(w.toFixed(2)).toString();
    }

    if(!target) {
        if(sort) {
            ["[name=character-tags]:checked", "[name=copyright-tags]:checked", "[name=artist-tags]:checked", "[name=species-tags]:checked", "[name=general-tags]:checked"].forEach((t) => { createTags(t); });
        } else {
            createTags(`${tagListSelector} input[type='checkbox']:checked`);
        }
    } else {
        createTags(target);
    }

    function createTags(target) {
        document.querySelectorAll(target).forEach((e) => {
            let prompts = e.value;
            if(bracket_escape) {
                prompts = prompts.replaceAll(`(`, `\\(`).replaceAll(`)`, `\\)`);
            }


            // Add prefixes if Sort by NovelAI method is active
            if(sort) {
                let prefix = "";
                if(e.name === "character-tags") {
                    prefix = "character";
                } else if(e.name === "copyright-tags") {
                    prefix = "copyright";
                } else if(e.name === "artist-tags") {
                    prefix = "artist";
                }

                prompts = addPrefix(prompts, prefix);
            }

            if(set_weight) {
                if(use_bracket === 2) {
                    let w = parseFloat(e.nextSibling.value);
                    if(isNaN(w)) w = 1;
                    let isArtist = sort && e.name === "artist-tags";
                    if(w !== 1 || isArtist) {
                        prompts = `${formatNegpipWeight(w)}::${prompts}::`;
                    }
                } else if(use_bracket === 1) {
                    prompts = addBrackets(prompts, false, e.nextSibling.value);
                } else {
                    prompts = addBrackets(prompts, true, e.nextSibling.value);
                }
            }
            tags.push(prompts);
        });
    }

    if(sort) {
        const regexp = /[1-6]\+?(girl|boy)s?/;
        const girlsTags = tags.filter(tag => tag.includes('girl') && regexp.test(tag));
        const boysTags = tags.filter(tag => !tag.includes('girl') && regexp.test(tag));
        const otherTags = tags.filter(tag => !regexp.test(tag));
        reorderedTags = [...boysTags, ...girlsTags, ...otherTags];
    } else {
        reorderedTags = tags;
    }

    let res = reorderedTags.join(", ");

    GM.setClipboard(res);
    GM.notification(`${reorderedTags.length} tag(s) were copied.`, "Danbooru Tags Sort and Exporter");
}

    function insertButtons(target){
        let head = document.querySelector(`h3.${target}-tag-list`)
        if (location.hostname == "gelbooru.com" || location.hostname == "rule34.xxx") {
            head = document.querySelector(`.tag-type-${target}`)
        }
        if (location.hostname == "e621.net") {
            head = document.querySelector(`.${target}-tag-list`)
        }
        if(!head) return;
        let buttonContainer = Container.cloneNode(true)
        buttonContainer.id = `${target}-tag-buttons`
        if (location.hostname == "gelbooru.com" || location.hostname == "rule34.xxx" || location.hostname == "e621.net") {
            insertBefore(buttonContainer, head)
        } else {
            insertAfter(buttonContainer, head)
        }

        let tagItem = `.${target}-tag-list>li`;
        if (location.hostname == "gelbooru.com" || location.hostname == "rule34.xxx") {
            tagItem = `.tag-type-${target}`;
        }

        document.querySelectorAll(tagItem).forEach((e) => {
            let chk = document.createElement('input');
            chk.type = "checkbox"
            chk.name = `${target}-tags`
            if (location.hostname == "gelbooru.com" || location.hostname == "rule34.xxx" || location.hostname == "e621.net") {
                let aTags = e.querySelectorAll('a');
                if (aTags.length > 0) {
                    let lastATag = aTags[aTags.length - 1];
                    chk.value = lastATag.textContent;
                }
            } else {
                chk.value = e.dataset.tagName.replaceAll("_", " ")
            }
            if(settings.selections[target.replace("-tag", "")]) {
                chk.checked = true
            }
            e.insertBefore(chk, e.firstChild)

            let nbr = document.createElement('input');
            nbr.type = "number"
            nbr.name = `${target}-tags-weight`
            nbr.className = "tag-weight"
            nbr.value = 0
            nbr.step = "1"
            nbr.hidden = true
            nbr.addEventListener("input", function () {
                let mode = parseInt(document.querySelector("input[name='use_bracket']:checked").value) || 0;
                if(mode === 2) {
                    let m = this.value.match(/^-?\d*(?:\.?\d{0,2})/);
                    this.value = m ? m[0] : this.value;
                } else {
                    this.value = this.value.replace(/\..*$/, "");
                }
            });
            insertAfter(nbr,chk)
        })

        buttonContainer.querySelector("[name='select_all']").onclick = function () {
            var items = document.getElementsByName(`${target}-tags`);
            for (var i = 0; i < items.length; i++) {
                items[i].checked = true;

            }
        };
        buttonContainer.querySelector("[name='select_none']").onclick = function () {
            var items = document.getElementsByName(`${target}-tags`);
            for (var i = 0; i < items.length; i++) {
                items[i].checked = false;

            }
        };
        buttonContainer.querySelector("[name='invert_select']").onclick = function () {
            var items = document.getElementsByName(`${target}-tags`);
            for (var i = 0; i < items.length; i++) {
                items[i].checked == true ? items[i].checked = false : items[i].checked = true;

            }
        };
        buttonContainer.querySelector("[name='export']").onclick = function () {
            exportTags(`[name=${target}-tags]:checked`)
        };
    }

    function setSettings() {
        let sort = document.getElementById("sort").checked;
        let bracketEscape = document.getElementById("bracket-escape").checked;
        let setWeight = document.getElementById("set-weight").checked;
        let useBracket = parseInt(document.querySelector("input[name='use_bracket']:checked").value);
        let selections = {artist: document.getElementById("select-artist").checked,
                          copyright: document.getElementById("select-copyright").checked,
                          character: document.getElementById("select-character").checked,
                          species: document.getElementById("select-species").checked,
                          general: document.getElementById("select-general").checked
                         };
        localStorage.setItem("settings", JSON.stringify({sort: sort, bracketEscape: bracketEscape, setWeight: setWeight, useBracket: useBracket, selections: selections}));
        // console.log(JSON.parse(localStorage.getItem("settings")));
    }

    function resetSettings() {
        localStorage.removeItem("settings");
        document.getElementById("sort").checked = initialSettings.sort;
        document.getElementById("bracket-escape").checked = initialSettings.bracketEscape;
        document.getElementById("set-weight").checked = initialSettings.setWeight;
        let useBracket = parseInt(initialSettings.useBracket) || 0;
        document.getElementById("round-brackets").checked = useBracket === 0;
        document.getElementById("curly-brackets").checked = useBracket === 1;
        document.getElementById("negpip-syntax").checked = useBracket === 2;
        toggleWeightInputs();
        document.getElementById("select-artist").checked = initialSettings.selections.artist;
        document.getElementById("select-copyright").checked = initialSettings.selections.copyright;
        document.getElementById("select-character").checked = initialSettings.selections.character;
        document.getElementById("select-species").checked = initialSettings.selections.species;
        document.getElementById("select-general").checked = initialSettings.selections.general;
    }

    let currentWeightMode = parseInt(settings.useBracket) || 0;

    function toggleWeightInputs(event) {
        const setWeightChecked = document.getElementById('set-weight').checked;
        const mode = parseInt(document.querySelector("input[name='use_bracket']:checked").value) || 0;
        const isNegpip = mode === 2;
        if(document.body) {
            document.body.classList.toggle("negpip-mode", isNegpip);
        }
        const inputs = document.querySelectorAll(`${tagListSelector} input[type='number']`);
        inputs.forEach(e => {
            e.hidden = !setWeightChecked;
            e.step = isNegpip ? "0.01" : "1";
        });
        if(isNegpip !== (currentWeightMode === 2)) {
            inputs.forEach(e => { e.value = isNegpip ? 1 : 0; });
        }
        currentWeightMode = mode;
    }

    ["artist","character","copyright", "species", "general"].forEach((t)=>insertButtons(t))

    toggleWeightInputs();

    Container.querySelector("[name='select_all']").onclick = function () {
        var items = document.querySelectorAll(`${tagListSelector} input[type='checkbox']`)
        for (var i = 0; i < items.length; i++) {
            items[i].checked = true;
        }
    };
    Container.querySelector("[name='select_none']").onclick = function () {
        var items = document.querySelectorAll(`${tagListSelector} input[type='checkbox']`)
        for (var i = 0; i < items.length; i++) {
            items[i].checked = false;
        }
    };
    Container.querySelector("[name='invert_select']").onclick = function () {
        var items = document.querySelectorAll(`${tagListSelector} input[type='checkbox']`)
        for (var i = 0; i < items.length; i++) {
            items[i].checked == true ? items[i].checked = false : items[i].checked = true;
        }
    };
    Container.querySelector("[name='export']").onclick = function () {
        exportTags()
    };
    SettingPanel.querySelector("[name='reset_settings']").onclick = function () {
        resetSettings()
    };
    SettingPanel.querySelectorAll("input[type='radio'], input[type='checkbox']").forEach(e => {
        e.onchange = function (event) {
            setSettings();
            toggleWeightInputs(event);
        };
    });

})();
