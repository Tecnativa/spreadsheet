/** @odoo-module */

import {DataSources} from "@spreadsheet/data_sources/data_sources";
import {migrate} from "@spreadsheet/o_spreadsheet/migration";
import spreadsheet from "@spreadsheet/o_spreadsheet/o_spreadsheet_extended";

const {Model} = spreadsheet;

/**
 * @type {{
 *  NotLoaded: "NotLoaded",
 *  Loading: "Loading",
 *  Loaded: "Loaded",
 *  Error: "Error",
 * }}
 */
export const Status = {
    NotLoaded: "NotLoaded",
    Loading: "Loading",
    Loaded: "Loaded",
    Error: "Error",
};

/**
 * @typedef Sheet
 * @property {number} id
 * @property {string} displayName
 * @property {string} status
 * @property {Model} [model]
 * @property {Error} [error]
 *
 * @typedef SheetGroupData
 * @property {number} id
 * @property {string} name
 * @property {Array<number>} sheetIds
 *
 * @typedef SheetGroup
 * @property {number} id
 * @property {string} name
 * @property {Array<Sheet>} sheets
 *
 * @typedef {(sheetId: number) => Promise<{ data: string, revisions: object[] }>} FetchSheetData
 *
 * @typedef {import("@web/env").OdooEnv} OdooEnv
 *
 * @typedef {import("@web/core/orm_service").ORM} ORM
 */

export class SheetLoader {
    /**
     * @param {OdooEnv} env
     * @param {ORM} orm
     * @param {FetchSheetData} fetchSheetData
     */
    constructor(env, orm, fetchSheetData) {
        /** @private */
        this.env = env;
        /** @private */
        this.orm = orm;
        /** @private @type {Array<SheetGroupData>} */
        this.groups = [];
        /** @private @type {Object<number, Sheet>} */
        this.sheets = {};
        /** @private */
        this.fetchSheetData = fetchSheetData;
    }

    /**
     * @param {Array<SheetGroupData>} groups
     * @param {Object<number, Sheet>} sheets
     */
    restoreFromState(groups, sheets) {
        this.groups = groups;
        this.sheets = sheets;
    }

    /**
     * Return data needed to restore a sheet loader
     */
    getState() {
        return {
            groups: this.groups,
            sheets: this.sheets,
        };
    }

    async load(sheetId) {
        const sheet = await this._fetchSheet(sheetId);
        this.sheets[sheetId] = {
            id: sheetId,
            displayName: sheet.name,
            status: Status.NotLoaded,
        };
        // this.groups = groups
        //     .filter((group) => group.sheet_ids.length)
        //     .map((group) => ({
        //         id: group.id,
        //         name: group.name,
        //         sheetIds: group.sheet_ids,
        //     }));
        // const sheets = await this._fetchSheetNames(this.groups);
        // for (const sheet of sheets) {
        //     this.sheets[sheet.id] = {
        //         id: sheet.id,
        //         displayName: sheet.name,
        //         status: Status.NotLoaded,
        //     };
        // }
    }

    /**
     * @param {number} sheetId
     * @returns {Sheet}
     */
    getSheet(sheetId) {
        const sheet = this._getSheet(sheetId);
        if (sheet.status === Status.NotLoaded) {
            this._loadSheetData(sheetId);
        }
        return sheet;
    }

    /**
     * @returns {Array<SheetGroup>}
     */
    getSheetGroups() {
        return this.groups.map((section) => ({
            id: section.id,
            name: section.name,
            sheets: section.sheetIds.map((sheetId) => ({
                id: sheetId,
                displayName: this._getSheet(sheetId).displayName,
                status: this._getSheet(sheetId).status,
            })),
        }));
    }

    /**
     * @private
     * @returns {Promise<{id: number, name: string, sheet_ids: number[]}[]>}
     */
    _fetchGroups() {
        return this.orm.searchRead(
            "spreadsheet.sheet.group",
            [["sheet_ids", "!=", false]],
            ["id", "name", "sheet_ids"]
        );
    }

    /**
     * @private
     * @returns {Promise<{id: number, name: string, sheet_ids: number[]}[]>}
     */
    _fetchSheet(sheetId) {
        return this.orm.read("spreadsheet.sheet", [sheetId], ["name", "raw"]);
    }

    /**
     * @private
     * @param {Array<SheetGroupData>} groups
     * @returns {Promise}
     */
    _fetchSheetNames(groups) {
        return this.orm.read(
            "spreadsheet.sheet",
            groups.map((group) => group.sheetIds).flat(),
            ["name"]
        );
    }

    /**
     * @private
     * @param {number} id
     * @returns {Sheet|undefined}
     */
    _getSheet(id) {
        if (!this.sheets[id]) {
            throw new Error(`Sheet ${id} does not exist`);
        }
        return this.sheets[id];
    }

    /**
     * @private
     * @param {number} sheetId
     */
    async _loadSheetData(sheetId) {
        const sheet = this._getSheet(sheetId);
        sheet.status = Status.Loading;
        try {
            const {data, revisions} = await this.fetchSheetData(sheetId);
            sheet.model = this._createSpreadsheetModel(data, revisions);
            sheet.status = Status.Loaded;
        } catch (error) {
            sheet.error = error;
            sheet.status = Status.Error;
        }
    }

    /**
     * Activate the first sheet of a model
     *
     * @param {Model} model
     */
    _activateFirstSheet(model) {
        const sheetId = model.getters.getActiveSheetId();
        const firstSheetId = model.getters.getSheetIds()[0];
        if (firstSheetId !== sheetId) {
            model.dispatch("ACTIVATE_SHEET", {
                sheetIdFrom: sheetId,
                sheetIdTo: firstSheetId,
            });
        }
    }

    /**
     * @private
     * @param {string} data
     * @param {object[]} revisions
     * @returns {Model}
     */
    _createSpreadsheetModel(data, revisions = []) {
        const dataSources = new DataSources(this.orm);
        const model = new Model(
            migrate(JSON.parse(data)),
            {
                evalContext: {env: this.env, orm: this.orm},
                mode: "sheet",
                dataSources,
            },
            revisions
        );
        this._activateFirstSheet(model);
        dataSources.addEventListener("data-source-updated", () =>
            model.dispatch("EVALUATE_CELLS")
        );
        return model;
    }
}
