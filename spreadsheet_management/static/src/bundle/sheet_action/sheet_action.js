/** @odoo-module */

import {registry} from "@web/core/registry";
import {ControlPanel} from "@web/search/control_panel/control_panel";
import {SheetLoader, Status} from "./sheet_loader";
import spreadsheet from "@spreadsheet/o_spreadsheet/o_spreadsheet_extended";
import {useSetupAction} from "@web/webclient/actions/action_hook";
import {SheetMobileSearchPanel} from "./mobile_search_panel/mobile_search_panel";
import {MobileFigureContainer} from "./mobile_figure_container/mobile_figure_container";
import {FilterValue} from "@spreadsheet/global_filters/components/filter_value/filter_value";
import {loadSpreadsheetDependencies} from "@spreadsheet/helpers/helpers";
import {useService} from "@web/core/utils/hooks";

const {Spreadsheet} = spreadsheet;
const {Component, onWillStart, useState, useEffect} = owl;

export class SpreadsheetSheetAction extends Component {
    setup() {
        this.Status = Status;
        this.controlPanelDisplay = {
            "top-left": true,
            "top-right": true,
            "bottom-left": false,
            "bottom-right": false,
        };
        this.orm = useService("orm");
        this.router = useService("router");
        // Use the non-protected orm service (`this.env.services.orm` instead of `useService("orm")`)
        // because spreadsheets models are preserved across multiple components when navigating
        // with the breadcrumb
        // TODO write a test
        /** @type {SheetLoader}*/
        this.loader = useState(
            new SheetLoader(this.env, this.env.services.orm, this._fetchSheetData)
        );
        onWillStart(async () => {
            await loadSpreadsheetDependencies();
            const activeSheetId = this.getInitialActiveSheet();
            if (this.props.state && this.props.state.sheetLoader) {
                const {groups, sheets} = this.props.state.sheetLoader;
                this.loader.restoreFromState(groups, sheets);
            } else if (activeSheetId) {
                await this.loader.load(activeSheetId);
                this.openSheet(activeSheetId);
            }
        });
        useEffect(
            () => this.router.pushState({sheet_id: this.activeSheetId}),
            () => [this.activeSheetId]
        );
        useEffect(
            () => {
                const sheet = this.state.activeSheet;
                if (sheet && sheet.status === Status.Loaded) {
                    const render = () => this.render(true);
                    sheet.model.on("update", this, render);
                    return () => sheet.model.off("update", this, render);
                }
            },
            () => {
                const sheet = this.state.activeSheet;
                return [sheet && sheet.model, sheet && sheet.status];
            }
        );
        useSetupAction({
            getLocalState: () => {
                return {
                    activeSheetId: this.activeSheetId,
                    sheetLoader: this.loader.getState(),
                };
            },
        });
        /** @type {{ activeSheet: import("./sheet_loader").Sheet}} */
        this.state = useState({activeSheet: undefined});
    }

    /**
     * @returns {number | undefined}
     */
    get activeSheetId() {
        return this.state.activeSheet ? this.state.activeSheet.id : undefined;
    }

    /**
     * @returns {object[]}
     */
    get filters() {
        const sheet = this.state.activeSheet;
        if (!sheet || sheet.status !== Status.Loaded) {
            return [];
        }
        return sheet.model.getters.getGlobalFilters();
    }

    /**
     * @private
     * @returns {number | undefined}
     */
    getInitialActiveSheet() {
        if (this.props.state && this.props.state.activeSheetId) {
            return this.props.state.activeSheetId;
        }
        // const params = this.props.action.params || this.props.action.context.params;
        const params = this.props.action.context.params;
        if (params && params.sheet_id) {
            return params.sheet_id;
        }
        const [firstSection] = this.getSheetGroups();
        if (firstSection && firstSection.sheets.length) {
            return firstSection.sheets[0].id;
        }
    }

    getSheetGroups() {
        return this.loader.getSheetGroups();
    }

    /**
     * @param {number} sheetId
     */
    openSheet(sheetId) {
        this.state.activeSheet = this.loader.getSheet(sheetId);
    }

    /**
     * @private
     * @param {number} sheetId
     * @returns {Promise<{ data: string, revisions: object[] }>}
     */
    async _fetchSheetData(sheetId) {
        const [record] = await this.orm.read("spreadsheet.sheet", [sheetId], ["raw"]);
        return {data: record.raw, revisions: []};
    }
}
SpreadsheetSheetAction.template = "spreadsheet_management.SheetAction";
SpreadsheetSheetAction.components = {
    ControlPanel,
    Spreadsheet,
    FilterValue,
    SheetMobileSearchPanel,
    MobileFigureContainer,
};

registry
    .category("actions")
    .add("action_spreadsheet_sheet", SpreadsheetSheetAction, {force: true});
