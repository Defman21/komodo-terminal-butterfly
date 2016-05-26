if (typeof(ko) == 'undefined')
{
    var ko = {};
}

ko.terminal = new function()
{
    const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

    var process;
    var log = require("ko/logging").getLogger("ko-terminal");
    
    this.process = process;
    
    this.onerror = (err) =>
    {
        var error = err.split(/\r?\n/);
        error = error[error.length - 2];
        require('notify').send(`Terminal: ${error}`, {priority: "error", category: "terminal"});
        log.error(err);
    };

    this.init = () =>
    {
        require('notify/categories').register('terminal', {label: "Terminal"});
        var koFile = require("ko/file");
        var koDirSvc = Cc["@activestate.com/koDirs;1"].getService();
        var pythonExe = koDirSvc.pythonExe;
        var pythonLib = koFile.join(koFile.dirname(pythonExe), "..", "lib", "python2.7");
        
        var koResolve = Cc["@activestate.com/koResolve;1"]
                                .getService(Ci.koIResolve);
        var addonPath = koResolve.uriToPath("chrome://koterminal/content/terminal.js");
        addonPath = koFile.join(koFile.dirname(addonPath), '..');
        
        var libDir = koFile.join(addonPath, 'pylib');
        var butterflyDir = koFile.join(libDir, 'butterfly');
        var shell = require("ko/shell");
        
        var env = shell.getEnv();
        env.PYTHONPATH = ["", pythonLib];
        env.PYTHONPATH.push(koFile.join(libDir, "tornado"));
        env.PYTHONPATH.push(koFile.join(libDir, "tornado-systemd"));
        env.PYTHONPATH.push(koFile.join(libDir, "backports_abc"));
        env.PYTHONPATH.push(koFile.join(libDir, "singledispatch"));
        env.PYTHONPATH.push(koFile.join(libDir, "python-certifi"));
        env.PYTHONPATH.push(koFile.join(libDir, "python-backports.ssl-match-hostname", "src"));
        env.PYTHONPATH = env.PYTHONPATH.join(":");
        
        process = shell.run(pythonExe, [koFile.join(butterflyDir, 'butterfly.server.py'), '--unsecure'], {cwd: butterflyDir, env: env});
        
        process.stdout.on('data', log.debug);
        process.stderr.on('data', this.onerror);

    };
};

window.addEventListener("komodo-ui-started", ko.terminal.init.bind(ko.terminal));
