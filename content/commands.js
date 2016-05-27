if (typeof(ko.terminal) == 'undefined')
{
    ko.terminal = {};
}

ko.terminal.commands = new function()
{
    const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
    
    var insertIntoButterfly = (event, text, write) =>
    {
        var window = $(event.target).parent().parent().element(); // so the command should be invoked only by menuitem
        var panel = $("tab[selected=true]", window).attr('linkedpanel');
        panel = $(`#${panel}`, window).element();
        var browser = $(`browser`, panel).element();
        if (typeof(write) != "undefined" && write) {
            browser.contentWindow.wrappedJSObject.butterfly.write(text);
        } else {
            browser.contentWindow.wrappedJSObject.butterfly.send(text);
        }
    };
    
    var $ = require('ko/dom');
    this.insertCurrentPath = (e) => {
        insertIntoButterfly(e, require('ko/views').current().file.dirName);
    };
    
    this.insertCurrentProject = (e) => {
        var partSvc = Cc["@activestate.com/koPartService;1"].getService(Ci.koIPartService);
        if (partSvc.currentProject === null) {
            require('notify').send(`Terminal: You don't have any project opened`, {priority: "error", category: "terminal"});
            return false;
        }
        var project = partSvc.currentProject.liveDirectory;
        insertIntoButterfly(e, project);
    };
    
    var setCWD = (event, string) =>
    {
        insertIntoButterfly(event, `cd ${string} \&\& clear`);
        insertIntoButterfly(event, '\015');
    };
    
    this.cwdCurrentPath = (e) => {
        setCWD(e, require('ko/views').current().file.dirName);
    };
    
    this.cwdCurrentProject = (e) => {
    var partSvc = Cc["@activestate.com/koPartService;1"].getService(Ci.koIPartService);
        if (partSvc.currentProject === null) {
            require('notify').send(`Terminal: You don't have any project opened`, {priority: "error", category: "terminal"});
            return false;
        }
        var project = partSvc.currentProject.liveDirectory;
        setCWD(e, project);
    };
};
