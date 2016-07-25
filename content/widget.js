(function() {
    
    //var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    //var mw = wm.getMostRecentWindow("Komodo");
    //window.ko = mw.ko;
    
    const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
    const { NetUtil } = Cu.import("resource://gre/modules/NetUtil.jsm", {});
    var $ = require("ko/dom");
    var tabNo = 1;
    var tabId = Math.floor((Math.random() * 10000) + 1);
    var pinned = [];
    var menupopup;
    var log = require('ko/logging').getLogger('komodo_terminal');
    
    var insertIntoButterfly = (text, browser = null, tab = null, execute = false) =>
    {
        var panel;
        if (tab === null && browser === null) {
            panel = $("tab[selected=true]", window).attr('linkedpanel');
            panel = $(`#${panel}`, window).element();
            browser = $(`browser`, panel).element();
        }
        if (typeof(browser.contentWindow.wrappedJSObject.butterfly) === 'undefined') {
            return setTimeout(insertIntoButterfly.bind(null, text, browser, tab, execute), 150);
        } else {
            browser.contentWindow.wrappedJSObject.butterfly.send(text);
            if (execute) browser.contentWindow.wrappedJSObject.butterfly.send('\015');
        }
    };
    
    this.init = () =>
    {
        pinned = JSON.parse(require('ko/prefs').getString('komodo_terminal_pinned_tabs', '[]'));
        
        menupopup = $("#menupopup", window);
        
        for (let pin of pinned) {
            this.newTab(null, pin);
        }
        
        this.newTab(null, null);
        
        $("tabs", window).element().newTabButton.addEventListener("command", this.newTab);
    };
    
    this.newTab = (event, _tab = null) =>
    {
        var pTabId, label, id, _pinned, _command;
        if (_tab === null) {
            label = 'Terminal #' + tabNo;
            pTabId = tabId;
            id = "tab" + tabId;
            _pinned = false;
            _command = "";
        } else {
            label = _tab.label[0] != "•" ? "• " + _tab.label : _tab.label;
            pTabId = _tab.id.substring(3);
            id = _tab.id;
            _pinned = true;
            _command = _tab.command;
        }
        var tabs = $("tab", window).length + 1;
        var browser = $("<browser/>").attr({src: "http://localhost:57575/", "flex": 1, style: "width: 100%"});
        var tab = $("<tab/>").attr({id, linkedpanel: "tabpanel" + pTabId, label, pinned: _pinned, _command});
        
        tab.on('contextmenu', (e) => {
            if ($(e.target).attr('pinned') == "true") {
                $("#pin-menuitem", menupopup.element()).element().label = "Unpin";
                $("#changecmd-menuitem", menupopup.element()).attr("disabled", "false");
            } else {
                $("#pin-menuitem", menupopup.element()).element().label = "Pin";
                $("#changecmd-menuitem", menupopup.element()).attr("disabled", "true");
            }
            menupopup.element().openPopup(e.target, "after_pointer", 0, 0, true, false, e);
        });
        
        $("tabs", window).append(tab);
        $("tabpanels", window).append(
            $("<tabpanel/>").attr({id: "tabpanel" + pTabId, "flex": 1}).append(browser)
        );
        
        $("tabbox", window).element().selectedIndex = tabs-1;
        
        tab.on("close-tab", this.closeTab.bind(null, tab));
        
        if (tabs > 1 && _tab === null)
            tab.addClass('closeable');
        
        if (_tab !== null) {
            console.log("loading pinned tab");
            this.loadBrowser(browser.element(), (browser, tab) => {
                if (tab.command.length > 0) {
                    insertIntoButterfly(tab.command, browser, tab, true);
                }
            }, [_tab]);
        } else {
            this.loadBrowser(browser.element());
            tabId = Math.floor((Math.random() * 10000) + 1);
            tabNo++;
        }
    };
    
    this.closeTab = (tab, e) =>
    {
        var tabs = $("tab", window).length;
        if (tabs == 1) {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }
        
        var index = 0;
        var sibling = tab.element();
        while (sibling.previousSibling) {
            sibling = sibling.previousSibling;
            index++;
        }
        
        var selected = !! tab.attr("selected");
        
        $(`tab:nth-child(${index + 1}), tabpanel:nth-child(${index + 1})`, window).remove();
        
        if (tabs == 2)
        {
            $("tab", window).removeClass('closeable');
        }
        
        if (selected)
        {
            var selectedIndex = index;
            if (index > 0) selectedIndex = index - 1;
            $("tabbox", window).element().selectedIndex = selectedIndex;
        }
        
        e.stopPropagation();
        e.preventDefault();
        return false;
    };
    
    this.loadBrowser = (browser, callback = false, args = false) =>
    {
        if (browser.contentDocument.readyState !== 'complete')
            return setTimeout(this.loadBrowser.bind(null, browser, callback, args), 100);

        this.forceClipboard(browser);
        this.loadStyleSheet(browser);
        if (typeof(callback) === 'function') {
            callback.apply(null, [browser].concat(args));
        }
    };
 
    // Fix ctrl+shift+c and ctrl+shift+v not working due to a bug in butterfly
    this.forceClipboard = (browser) =>
    {
        browser.contentWindow.addEventListener("keypress", (e) =>
        {
            if (e.shiftKey && e.ctrlKey && e.which == 67) // ctrl+shift+c
            {
                var selText = browser.contentWindow.getSelection().toString();
                xtk.clipboard.setText(selText);
            }
            else if (e.shiftKey && e.ctrlKey && e.which == 86) // ctrl+shift+v
            {
                var text = xtk.clipboard.getText();
                browser.contentWindow.wrappedJSObject.butterfly.send(text);
            }
        });
    };

    this.closeTabs = () =>
    {
        $(`tab, tabpanel`, window).remove();
    };

    this.loadStyleSheet = (browser) =>
    {
        var style = browser.contentDocument.createElement('link');
        style.setAttribute('rel', 'stylesheet');
        style.setAttribute('href', 'less://koterminal/skin/terminal.less');
        browser.contentDocument.getElementsByTagName("head")[0].appendChild(style);
    };
    
    var setCWD = (string) =>
    {
        insertIntoButterfly(`cd ${string}`);
        insertIntoButterfly('\015');
    };
    
    this.insertCurrentPath = () => {
        insertIntoButterfly(require('ko/views').current().file.dirName);
    };
    
    this.insertCurrentPlaces = () => {
        var path = ko.uriparse.URIToLocalPath(ko.places.getDirectory());
        insertIntoButterfly(path);
    };
    
    this.cwdCurrentPath = () => {
        setCWD(require('ko/views').current().file.dirName);
    };
    
    this.cwdCurrentPlaces = () => {
        var path = ko.uriparse.URIToLocalPath(ko.places.getDirectory());
        setCWD(path);
    };
    
    this.renameTab = (e) => {
        var tab = e.target.parentNode.anchorNode;
        var name = require('ko/dialogs').prompt("Enter the name: ");
        if (name) {
            tab.label = name;
            if ($("#" + tab.id, window).attr('pinned') == "true") {
                this._updatePinnedTab({
                    id: tab.id,
                    label: name,
                    command: $("#" + tab.id, window).attr('_command')
                });
                tab.label = "• " + tab.label;
            }
        }
    };
    
    this.handlePinEvent = (e) => {
        var tab = e.target.parentNode.anchorNode;
        var pinned = $(tab).attr('pinned') == "true" ? true : false;
        $(tab).attr('pinned', !pinned);
        if (pinned) this._unpinTab(tab); else this._pinTab(tab);
    };
    
    this._updatePinnedTab = (tab) => {
        var i = 0;
        for (let t of pinned) {
            if (t.id == tab.id) {
                pinned[i] = tab;
                break;
            }
            i++;
        }
        this._savePinnedObject();
    };
    
    this.handleChangeCommandEvent = (e) => {
        var tab = e.target.parentNode.anchorNode;
        var id = tab.id;
        var command = $(tab).attr("_command");
        if (command === "null") command = "";
        var _tab = {
            id,
            label: tab.label,
            command
        };
        _tab.command = require('ko/dialogs').prompt("Enter the command to execute when the tab is restored: ", {value: command});
        $(tab).attr("_command",_tab.command);
        this._updatePinnedTab(_tab);
    };
    
    this._unpinTab = (tab) => {
        this._removeTabFromPinlist(tab);
        tab.label = tab.label.substring(2);
        tab.id = tab.id.slice(0, -4);
        $(tab).addClass('closeable');
    };
    
    this._pinTab = (tab) => {
        tab.id = tab.id + "_pin";
        this._addTabToPinlist(tab);
        tab.label = "• " + tab.label;
        $(tab).removeClass('closeable');
    };
    
    this._addTabToPinlist = (tab) => {
        var label = tab.label;
        var id = tab.id;
        var command = require('ko/dialogs').prompt("Enter the command to execute when the tab is restored: ");
        var object = {
            id,
            label,
            command
        };
        pinned.push(object);
        this._savePinnedObject();
    };
    
    this._removeTabFromPinlist = (tab) => {
        var id = tab.id;
        pinned = pinned.filter(t => t.id != id);
        this._savePinnedObject();
    };
    
    this._savePinnedObject = () => {
        require('ko/prefs').setString('komodo_terminal_pinned_tabs', JSON.stringify(pinned));
    };
    
    window.addEventListener("load", this.init);
    window.addEventListener("beforeunload", this.closeTabs);
})();
