const Applet = imports.ui.applet;
const Util = imports.misc.util;
const GLib = imports.gi.GLib;
const Mainloop = imports.mainloop;
const Lang = imports.lang;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Settings = imports.ui.settings;
const UUID = 'update-counter@albertomosconi';

function UpdateCounterApplet(orientation, panel_height, instance_id) {
  this._init(orientation, panel_height, instance_id);
}

UpdateCounterApplet.prototype = {
  __proto__: Applet.TextIconApplet.prototype,

  _init: function (orientation, panel_height, instance_id) {
    Applet.TextIconApplet.prototype._init.call(
      this,
      orientation,
      panel_height,
      instance_id,
    );

    this.set_applet_icon_name('start-here-archlinux');
    this.set_applet_tooltip(_('Count linux updates'));
    this.set_applet_label('Loading...');

    try {
      let OS = GLib.get_os_info('ID');
      switch (OS) {
        case 'arch':
          this.ICON_NAME = 'start-here-archlinux';
          this.COUNT_CMD = 'pacman -Sup';
          break;

        case 'debian':
          this.ICON_NAME = 'start-here-debian';
          this.COUNT_CMD = '';
          break;

        case 'ubuntu':
          this.ICON_NAME = 'start-here-ubuntu';
          this.COUNT_CMD = '';
          break;

        case 'linuxmint':
          this.ICON_NAME = 'start-here-linux-mint';
          this.COUNT_CMD = '';
          break;

        case 'elementary':
          this.ICON_NAME = 'start-here-ubuntu';
          this.COUNT_CMD = '';
          break;

        case 'fedora':
          this.ICON_NAME = 'start-here-fedora';
          this.COUNT_CMD = 'yum list updates';
          break;

        default:
          this.ICON_NAME = 'download';
          this.COUNT_CMD = '';
          break;
      }

      this.set_applet_icon_name(this.ICON_NAME);

      this.settings = new Settings.AppletSettings(this, UUID, this.instance_id);
      this.settings.bindProperty(
        Settings.BindingDirection.IN,
        'update-interval',
        'update_interval',
        this._new_freq,
        null,
      );
      // Create the popup menu
      this.menuManager = new PopupMenu.PopupMenuManager(this);
      this.menu = new Applet.AppletPopupMenu(this, orientation);
      this.menuManager.addMenu(this.menu);
      this._contentSection = new PopupMenu.PopupMenuSection();
      this.menu.addMenuItem(this._contentSection);

      // First item: Update
      let item = new PopupMenu.PopupIconMenuItem(
        'Update now',
        'download',
        St.IconType.FULLCOLOR,
      );
      item.connect(
        'activate',
        Lang.bind(this, function () {
          Util.spawnCommandLine(
            'gnome-terminal -e "zsh -c \'yay; echo Done - Press Enter to quit; read a\'"',
          );
        }),
      );
      this.menu.addMenuItem(item);

      // Second item: Refresh
      item = new PopupMenu.PopupIconMenuItem(
        'Refresh',
        'view-refresh-symbolic',
        St.IconType.FULLCOLOR,
      );
      item.connect(
        'activate',
        Lang.bind(this, function () {
          this._update_loop();
        }),
      );
      this.menu.addMenuItem(item);

      // Third item: Source
      item = new PopupMenu.PopupIconMenuItem(
        'View source',
        'github-desktop',
        St.IconType.FULLCOLOR,
      );
      item.connect(
        'activate',
        Lang.bind(this, function () {
          Util.spawnCommandLine(
            'xdg-open https://github.com/albertomosconi/arch-update-counter-applet',
          );
        }),
      );
      this.menu.addMenuItem(item);

      // start loop
      this._update_loop();
    } catch (e) {
      global.logError(e);
    }
  },

  on_applet_clicked: function () {
    this.menu.toggle();
  },

  on_applet_removed_from_panel: function () {
    // stop the loop when the applet is removed
    if (this._updateLoopID) {
      Mainloop.source_remove(this._updateLoopID);
    }
  },

  _run_cmd: function (command) {
    // run a command and return the output
    try {
      let [result, stdout, stderr] = GLib.spawn_command_line_sync(command);
      return stdout;
    } catch (e) {
      global.logError(e);
    }
    return null;
  },

  _count_updates: function () {
    // update the label with the number of updates
    let updates = this._run_cmd(this.COUNT_CMD);
    if (updates != null) {
      let count = 0;
      updates.map((n) => {
        if (n == 10) count += 1;
      });
      this.set_applet_label(count + ' ');
    }
  },

  _update_loop: function () {
    this._count_updates();
    this._updateLoopID = Mainloop.timeout_add_seconds(
      60,
      Lang.bind(this, this._update_loop),
    );
  },
};

function main(metadata, orientation, panel_height, instance_id) {
  return new UpdateCounterApplet(orientation, panel_height, instance_id);
}
