const LitElement = Object.getPrototypeOf(
    customElements.get("ha-panel-lovelace")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

function hasConfigOrEntityChanged(element, changedProps) {
    if (changedProps.has("_config")) {
        return true;
    }

    const oldHass = changedProps.get("hass");
    if (oldHass) {
        return (
            oldHass.states[element._config.entity] !==
            element.hass.states[element._config.entity]
        );
    }

    return true;
}

class HvvCard extends LitElement {
    static get properties() {
        return {
            _config: {},
            hass: {}
        };
    }

    setConfig(config) {
        if (config.entity) {
            throw new Error("The entity property is deprecated, please use entities instead.")
        }

        if (!config.entities) {
            throw new Error("The entities property is required.")
        }
        this._config = config;
    }

    shouldUpdate(changedProps) {
        return hasConfigOrEntityChanged(this, changedProps);
    }

    render() {
        if (!this._config || !this.hass) {
            return html``;
        }

        return html`
          <ha-card>
            ${this.renderTitle()}
            ${this._config.entities.map((ent) => this.renderEntity(ent))}
          </ha-card>
        `;
    }

    renderTitle() {
        const showTitle = this._config.show_title !== false;
        if (!showTitle) return html``;

        const title = this._config.title || "HVV Departures";
        return html`<h1 class="card-header">${title}</h1>`;
    }

    renderEntity(ent) {
        const stateObj = this.hass.states[ent];
        if (!stateObj) return renderNotFoundEntity(ent);

        const today = new Date();
        const max = this._config.max || 5;

        const { attributes } = stateObj;
        const { friendly_name: friendlyName, next: departures} = attributes;

        return html`
          <div>
              ${this.renderFriendlyName(friendlyName)}
              ${this.renderDepartures(departures, { max })}
          </div>
        `;
    }

    renderNotFoundEntity(entityName) {
        return html`
          <ha-card>
            <div class="not-found">Entity not available: ${entityName}</div>
          </ha-card>
        `;
    }

    renderFriendlyName(friendlyName) {
        const showName = this._config.show_name !== false;

        // FIXME: inline style
        return showName && friendlyName ? html`<h2 style="padding-left: 16px;">${friendlyName}</h2>` : ""
    }

    renderDepartures(departures, options = { max: undefined }) {
        if (!departures?.length) return html`<h3>No upcoming departures</h3>`;

        if (options?.max) departures = departures.slice(0, options.max);

        return html`
          <table>
          ${departures.map(departure => this.renderDeparture(departure))}
          </table>
        `;
    }

    renderDeparture(departure) {
        const { direction, line, type, delay: delaySecs, departure: departureDate } =  departure;
        return html`
          <tr>
            <td class="narrow line" style="text-align:center;"><span class="line ${type} ${line}">${line}</span></td>
            <td class="expand">${direction}</td>
            <td class="narrow time" style="text-align:right;">${this.departureTime({ departureDate, delaySecs })}</td>
          </tr>
      `;
    }

    departureTime({ departureDate, delaySecs }) {
        departureDate = new Date(departureDate);
        const showTime = this._config.show_time;
        let result;

        result = showTime
                    ? departureDate.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })
                    : this.formatDuration((departureDate - new Date())/1000);
        if (delaySecs) {
            result = html`${result} <span class="delay_minutes">${this.formatDuration(delaySecs)}</span>`;
        }

        return result;
    }

    formatDuration(seconds) {
        const divmod = (num, denom) => {
            const quot = num / denom;
            let div = Math.floor(Math.abs(quot));
            let mod = Math.abs(num % denom);

            if (quot < 0) {
                if (div === 0) mod = -mod;
                else div = -div;
            }
            return [div, mod];
        }

        const [hh, rest] = divmod(seconds, 3600);
        const [mm, ss] = divmod(rest, 60);


        if (hh) {
            let result = `${hh}h`;
            if (mm >= 10) result += ` ${mm}min`
            else if (mm > 0) result += ` 0${mm}min`

            return result;
        } else if (mm) return `${mm}min`
        else return 'now';
    }

    getCardSize() {
        // TODO: return proper number of lines
        return 1;
    }

    static get styles() {
        return css `
        table {
            width: 100%;
            padding: 6px 14px;
        }

        td { padding: 3px 0px; }
        td.narrow { white-space: nowrap; }
        td.expand { width: 95% }
        td.line { text-align: center; }
        td.time { text-align: right; }

        .not-found {
           flex: 1;
           background-color: yellow;
           padding: 8px;
        }

        span.line {
            font-weight: bold;
            font-size: 0.9em;
            padding: 3px 8px 2px 8px;
            color: #ffffff;
            background-color: #888888;
            margin-right: 0.7em;
        }

        span.delay_minutes { color: #e2001a; }

        span.S, span.A {
            background-color: #009252;
            border-radius: 999px;
        }

        span.U { border-radius: 0px; }

        span.Bus, span.XpressBus, span.Schnellbus, span.NachtBus {
            background-color: #e2001a;
            clip-path: polygon(20% 0, 80% 0, 100% 50%, 80% 100%, 20% 100%, 0 50%);
            width: 48px;
            margin-left: 0;
        }

        span.XpressBus { background-color: #1a962b; }

        span.NachtBus { background-color: #000000; }

        span.Schiff {
            background-color: #009dd1;
            clip-path: polygon(0 0, 100% 0, 90% 100%, 10% 100%);
        }

        span.ICE, span.RE, span.EC, span.IC, span.RB, span.R {
            background-color: transparent;
            color: #000;
        }

        span.U1 { background-color: #1c6ab3; }
        span.U2 { background-color: #e2021b; }
        span.U3 { background-color: #fddd00; }
        span.U4 { background-color: #0098a1; }
        span.S1 { background-color: #31962b; }
        span.S2 { background-color: #b51143; }
        span.S3 { background-color: #622181; }
        span.S4 { background-color: #BF0880; }
        span.S5 { background-color: #008ABE; }

        /* Not in use since 10.12.2023 */
        span.S11 { background-color: #31962b; }
        span.S21 { background-color: #b51143; }
        span.S31 { background-color: #622181; }
      `;
    }
}
customElements.define("hvv-card", HvvCard);
