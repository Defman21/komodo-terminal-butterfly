if (typeof(ko) == 'undefined')
{
    var ko = {};
}

ko.terminal = new function()
{
    const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
    const { NetUtil } = Cu.import("resource://gre/modules/NetUtil.jsm", {});

    var browser;

    this.init = () =>
    {
        browser = document.getElementById('terminal-widget');
        if (browser.contentDocument.readyState !== 'complete')
            return setTimeout(this.init.bind(this), 100);

        this.loadStyleSheet();

    };

    // Fix ctrl+shift+c and ctrl+shift+v not working due to a bug in butterfly
    this.forceClipboard = () =>
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

    this.loadStyleSheet = () =>
    {
        NetUtil.asyncFetch("chrome://koterminal/skin/terminal.css", function(inputStream, status)
        {
            // Validate result
            if ( ! Components.isSuccessCode(status))
            {
                return;
            }

            var css = NetUtil.readInputStreamToString(inputStream, inputStream.available());
            var style = browser.contentDocument.createElement('style');
            style.type = 'text/css';
            style.appendChild(browser.contentDocument.createTextNode(css));
            browser.contentDocument.getElementsByTagName("head")[0].appendChild(style)

        }.bind(this));
    }
};

window.addEventListener("workspace_restored", ko.terminal.init.bind(ko.terminal));
