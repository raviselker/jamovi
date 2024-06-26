
'use strict';

const $ = require('jquery');
const Backbone = require('backbone');
Backbone.$ = $;

const host = require('./host');
const auth = require('./auth/auth');
const { Event } = require('./utils/sync');


const Settings = Backbone.Model.extend({

    initialize(args) {
        let coms = this.attributes.coms;
        this._onBC = (broadcast) => this._onSettingsReceived(broadcast);
        coms.on('broadcast', this._onBC);

        this._localSettings = [ 'syntaxMode' ];  // not stored
        this._configSettings = [ 'mode' ];

        this._toSend = { };
        this._sendEvent = new Event();
        this._sendLoop();
    },

    destroy() {
        let coms = this.attributes.coms;
        coms.off('broadcast', this._onBC);
    },

    defaults: {
        coms: null,
        recents: [ ],
        //examples: [ ],
        modules: [ ],
        theme: 'default',
        devMode: false,
        syntaxMode: false,
        selectedLanguage: '',
        zoom: 100,
        updateStatus: 'na',
        format: '{"t":"sf","n":3,"p":3}',
    },

    retrieve(instanceId) {

        this._instanceId = instanceId;

        let coms = this.attributes.coms;
        let settings = new coms.Messages.SettingsRequest();
        let request = new coms.Messages.ComsMessage();
        request.payload = settings.toArrayBuffer();
        request.payloadType = 'SettingsRequest';
        request.instanceId = instanceId;

        return coms.send(request).then(response => {
            this._onSettingsReceived(response);
        });
    },

    _onSettingsReceived(message) {
        if (message.payloadType !== 'SettingsResponse')
            return;

        let coms = this.attributes.coms;
        let settingsPB = coms.Messages.SettingsResponse.decode(message.payload);
        this.set('recents',  settingsPB.recents);
        this.set('modules', settingsPB.modules);

        for (let settingPB of settingsPB.settings) {
            let name = settingPB.name;
            if (this._configSettings.includes(name))
                continue;
            let value = settingPB[settingPB.value];
            this.set(name, value);
        }

        for (let confPB of settingsPB.config) {
            let name = confPB.name;
            let value = confPB[confPB.value];
            this.set(name, value);
        }

        if (this.attributes.zoom !== host.currentZoom())
            host.zoom(this.attributes.zoom);
    },

    zoomIn() {
        host.zoomIn();
        let zoom = host.currentZoom();
        this.setSetting('zoom', zoom);
    },

    zoomOut() {
        host.zoomOut();
        let zoom = host.currentZoom();
        this.setSetting('zoom', zoom);
    },

    setSetting(name, value) {

        if (this.get(name) === value)
            return;

        this.set(name, value);

        if (this._localSettings.includes(name)) {
            return Promise.resolve();
        }
        else if (this._configSettings.includes(name)) {
            return Promise.resolve();
        }
        else {
            let coms = this.attributes.coms;

            let setting = new coms.Messages.SettingValue();
            setting.name = name;
            if (typeof value === 'string') {
                setting.valueType = coms.Messages.ValueType.STRING;
                setting.s = value;
            }
            else if (typeof value === 'boolean') {
                setting.valueType = coms.Messages.ValueType.BOOL;
                setting.b = value;
            }
            else if (Number.isInteger(value)) {
                setting.valueType = coms.Messages.ValueType.INT;
                setting.i = value;
            }
            else if (typeof value === 'number') {
                setting.valueType = coms.Messages.ValueType.DOUBLE;
                setting.d = value;
            }
            else {
                throw 'setSetting(): Not implemented for ' + (typeof value);
            }

            let settings = new coms.Messages.SettingsRequest();
            let request = new coms.Messages.ComsMessage();
            settings.settings.push(setting);

            request.payload = settings.toArrayBuffer();
            request.payloadType = 'SettingsRequest';
            request.instanceId = this._instanceId;

            this._toSend[name] = value;
            this._sendEvent.set();
        }
    },

    async _sendLoop() {
        while (true) {
            await this._sendEvent.wait();
            // debounce
            await new Promise((resolve) => setTimeout(resolve, 100));
            this._sendEvent.clear();
            await this._send();
        }
    },

    async _send() {
        if (Object.keys(this._toSend).length === 0)
            return;
        let sending = this._toSend;
        this._toSend = { };

        let coms = this.attributes.coms;
        let headers = { 'Content-Type': 'application/json' };
        let body = JSON.stringify(sending);

        try {
            await coms.post('/settings', { body, headers });
        }
        catch (e) {
            this._toSend = Object.assign(sending, this._toSend);
            throw e;
        }
    },

    getSetting(name, def4ult) {
        let value = this.attributes[name];
        return value !== undefined ? value : def4ult;
    },

});

module.exports = Settings;
