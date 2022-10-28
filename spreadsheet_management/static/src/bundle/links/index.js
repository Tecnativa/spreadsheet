/** @odoo-module */

import spreadsheet from "@spreadsheet/o_spreadsheet/o_spreadsheet_extended";
import SheetLinkPlugin from "./sheet_link_plugin";

const {uiPluginRegistry} = spreadsheet.registries;

uiPluginRegistry.add("odooSheetClickLink", SheetLinkPlugin);
