(function() {
    
    //var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    //var mw = wm.getMostRecentWindow("Komodo");
    //window.ko = mw.ko;
    
    const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
    const { NetUtil } = Cu.import("resource://gre/modules/NetUtil.jsm", {});
    var $ = require("ko/dom");
    var tabNo = 1;
    
    this.init = () =>
    {
        this.newTab();
        
        $("tabs", window).element().newTabButton.addEventListener("command", this.newTab);
    };
    
    this.newTab = () =>
    {
        var tabs = $("tab", window).length + 1;
        var browser = $("<browser/>").attr({src: "http://localhost:57575/", "flex": 1, style: "width: 100%"});
        var tab = $("<tab/>").attr({id: "tab" + tabNo, linkedpanel: "tabpanel" + tabNo, label: 'Terminal #' + tabNo});
        
        $("tabs", window).append(tab);
        $("tabpanels", window).append(
            $("<tabpanel/>").attr({id: "tabpanel" + tabNo, "flex": 1}).append(browser)
        );
        
        $("tabbox", window).element().selectedIndex = tabs-1;
        
        tab.on("close-tab", this.closeTab.bind(null, tab));
        
        if (tabs > 1)
            $("tab", window).addClass('closeable');
        
        this.loadBrowser(browser.element());
        
        tabNo++;
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
        
        $(`tab:nth-child(${index}), tabpanel:nth-child(${index})`, window).remove();
        
        if (tabs == 2)
        {
            $("tab", window).removeClass('closeable');
        }
        
        if (selected)
        {
            $("tabbox", window).element().selectedIndex = index - 1;
        }
        
        e.stopPropagation();
        e.preventDefault();
        return false;
    };
    
    this.loadBrowser = (browser) =>
    {
        if (browser.contentDocument.readyState !== 'complete')
            return setTimeout(this.loadBrowser.bind(null, browser), 100);

        this.forceClipboard(browser);
        this.loadStyleSheet(browser);
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
                browser.contentWindow.wrappedJSObject.butterfly.write(text);
            }
        });
    };

    this.loadStyleSheet = (browser) =>
    {
        var style = browser.contentDocument.createElement('link');
        style.setAttribute('rel', 'stylesheet');
        style.setAttribute('href', 'less://koterminal/skin/terminal.less');
        browser.contentDocument.getElementsByTagName("head")[0].appendChild(style);
    };
    
    window.addEventListener("load", this.init);
    
})();