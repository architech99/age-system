import * as Dice from "../dice.js";
import {ageSystem} from "../config.js";
import { sortObjArrayByName } from "../setup.js";

export default class ageSystemSheetCharacter extends ActorSheet {
    
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            // resizable: false,
            width: 680,
            height: 800,
            classes: ["age-system", "sheet", "char", "standard"],
            tabs: [{
                navSelector: ".add-sheet-tabs",
                contentSelector: ".sheet-tab-section",
                initial: "main"
            }]
        });
    }

    get template() {
        return `systems/age-system/templates/sheets/${this.actor.data.type}-sheet.hbs`;
    }

    get observerRoll () {
        return game.settings.get("age-system", "observerRoll");
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    getData(options) {
        const isOwner = this.document.isOwner;
        const isEditable = this.isEditable;
    
        // Copy actor data to a safe copy
        const data = this.actor.data.toObject(false);
        data.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));

        // const data = super.getData();
        data.config = CONFIG.ageSystem;

        // Order itens into alphabetic order
        const itemSorted = sortObjArrayByName(data.items, "name");

        data.weapon = itemSorted.filter(i => i.type === "weapon");
        data.talent = itemSorted.filter(i => i.type === "talent");
        data.power = itemSorted.filter(i => i.type === "power");
        data.focus = itemSorted.filter(i => i.type === "focus");
        data.stunts = itemSorted.filter(i => i.type === "stunts");
        // Order Stunts by stunt points, lowest to highest
        data.stunts = data.stunts.sort((a, b) => a.data.stuntPoints - b.data.stuntPoints);
        data.equipment = itemSorted.filter(i => i.type === "equipment");
        data.honorifics = itemSorted.filter(i => i.type === "honorifics");
        data.relationship = itemSorted.filter(i => i.type === "relationship");
        data.membership = itemSorted.filter(i => i.type === "membership");

        // Sorting Modifiers per Type/Item
        const modList = {}
        for (let i = 0; i < itemSorted.length; i++) {
            const item = itemSorted[i];
            const itemMods = item.data.itemMods
            if (itemMods && (item.data.equiped || item.data.activate)) {
                for (const m in itemMods) {
                    if (Object.hasOwnProperty.call(itemMods, m)) {
                        const mData = itemMods[m];
                        if (mData.selected) {
                            if (!modList[m]) modList[m] = [];
                            modList[m].push(item)
                        }
                    }
                }
            }
        }

        // Sort Conditions alphabetically
        data.conditions = sortObjArrayByName(data.config.conditions, "name");
        for (let c = 0; c < data.conditions.length; c++) {
            const element = data.conditions[c];
            element.active = this.actor.data.data.conditions[element.id];           
        };

        // Sorting Active Effects by Name
        // Separating Effects related to Conditions...
        data.condEffects = data.effects.filter(e => e.flags?.["age-system"]?.type === "conditions");
        // ...from all other Effects
        data.effects = data.effects.filter(e => !e.flags?.["age-system"]?.type);
        data.effects = sortObjArrayByName(data.effects, `label`);
    
        // Retrieve Prefession/Ancestry settings
        data.ancestry = game.settings.get("age-system", "ancestryOpt");
        data.occupation = game.settings.get("age-system", "occupation");

        // Retrieve Health Mode (Health/Fortune)
        data.healthMode = game.settings.get("age-system", "healthMode");

        // Sheet color
        data.colorScheme = game.settings.get("age-system", "colorScheme");

        // Options Tab Preparation
        // Weapon Groups
        data.weaponGroups = ageSystem.weaponGroups;


        // Return template data
        return {
            actor: this.object,
            cssClass: isEditable ? "editable" : "locked",
            data: data,
            itemMods: modList,
            effects: data.effects,
            items: data.items,
            limited: this.object.limited,
            options: this.options,
            owner: isOwner,
            editable: isEditable,
            title: this.title,
            isGM: game.user.isGM
        };
    };

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();

        const sheet = this.actor.getFlag('core', 'sheetClass');
        const isFull = sheet === undefined || sheet === 'age-system.ageSystemSheetCharacter';

        buttons = [
            {
              label: isFull ? game.i18n.localize("age-system.sheetBlock") : game.i18n.localize("age-system.sheetFull"),
              class: "configure-sheet-inuse",
              icon: "far fa-id-badge",
              onclick: ev => this._onToggleSheet(ev)
            }
        ].concat(buttons);

        return buttons;
    }

    async _onToggleSheet(event) {
        event.preventDefault()
        let newSheet = 'age-system.ageSystemSheetCharStatBlock'
        const original = this.actor.getFlag('core', 'sheetClass') || Object.values(CONFIG.Actor.sheetClasses['char']).filter(s => s.default)[0].id
        if (original != 'age-system.ageSystemSheetCharacter') newSheet = 'age-system.ageSystemSheetCharacter'
        this.actor.openSheet(newSheet)
    }
    
    activateListeners(html) {
        html.find(".tooltip-container").hover(this._onTooltipHover.bind(this));
        // Remove unncessary white space and line breaks from Textarea fields
        const freeText = html.find("textarea.free-text");
        for (let t = 0; t < freeText.length; t++) {
            const area = freeText[t];
            const newValue = area.value.replace(/^\s+|\s+$/gm,'');
            this.actor.update({[area.name]: newValue}).then(a => {
                area.value = newValue;
            })
        }    
        if (this.isEditable) {
            html.find(".item-edit").click(this._onItemEdit.bind(this));
            html.find(".item-delete").click(this._onItemDelete.bind(this));
            html.find(".last-up").change(this._onLastUpSelect.bind(this));
            html.find(".effect-edit").click(this._onChangeEffect.bind(this));
            html.find(".effect-remove").click(this._onRemoveEffect.bind(this));   
            html.find("p.effect-add").click(this._onAddEffect.bind(this));
            html.find(".change-qtd").click(this._onChangeQuantity.bind(this));
            html.find(".degree .change-injury").click(this._onChangeInjury.bind(this));
            html.find(".mark .change-injury").click(this._onChangeMark.bind(this));
            html.find(".refresh-injury-marks").click(this._onRefreshMarks.bind(this));
            html.find(".heal-all-injuries").click(this._onFullHeal.bind(this));

            // Enable field to be focused when selecting it
            const inputs = html.find("input");
            inputs.focus(ev => ev.currentTarget.select());
        };
        
        // Actions by sheet owner and observers (when optional settings is on)
        if (this.actor.isOwner || this.observerRoll) {
            html.find(".roll-ability")
                .click(this._onRollAbility.bind(this))
                .contextmenu(this._onRollAbility.bind(this));
            html.find(".roll-item")
                .click(this._onRollItem.bind(this))
                .contextmenu(this._onRollItem.bind(this));
            html.find(".roll-damage")
                .click(this._onRollDamage.bind(this))
                .contextmenu(this._onRollDamage.bind(this));
            html.find(".roll-resources")
                .click(this._onRollResources.bind(this))
                .contextmenu(this._onRollResources.bind(this));
            html.find(".effect-active").click(this._onActiveEffect.bind(this));
            html.find(".roll-toughness").click(this._onRollToughness.bind(this));
            let handler = ev => this._onDragStart(ev);
            
            // Find all rollable items on the character sheet.
            let items = html.find(".item-box");
            for (let i = 0; i < items.length; i++) {
                const el = items[i];
                if (el.draggable) {
                    el.addEventListener("dragstart", handler, false);
                }   
            }
        };

        if (this.actor.isOwner) {
            new ContextMenu(html, ".focus-options", this.focusContextMenu);
            html.find(".item-equip").click(this._onItemActivate.bind(this));
            html.find(".item-show").click(this._onItemShow.bind(this));
            html.find(".defend-maneuver").change(this._onDefendSelect.bind(this));
            html.find(".guardup-maneuver").change(this._onGuardUpSelect.bind(this));
            html.find(".condition-checkbox").change(this._onChangeCondition.bind(this));
            html.find(".mod-active.icon").click(this._onToggleItemMod.bind(this));
            html.find(".wgroup-item").click(this._onWeaponGroupToggle.bind(this));
        }

        super.activateListeners(html);
    };

    _onRollToughness(ev) {
        const event = new MouseEvent('contextmenu')
        const rollData = {
            actor: this.actor,
            event,
            flavor: `${this.actor.name} (${game.i18n.localize("age-system.toughness")})`,
            moreParts: [{
                label: game.i18n.localize("age-system.toughness"),
                value: this.actor.data.data.armor.toughness.total
            }],
            rollType: ageSystem.ROLL_TYPE.TOUGHNESS
        }
        Dice.ageRollCheck(rollData);
    }

    _onFullHeal() {
        const updateData = {
            "data.injury.degrees.light": 0,
            "data.injury.degrees.serious": 0,
            "data.injury.degrees.severe": 0,
            "data.injury.marks": 0,
        }
        return this.actor.update(updateData);
    }

    _onRefreshMarks(event) {
        const data = this.actor.data.data.injury.degrees;
        const marks = data.light + data.serious + data.severe * data.severeMult
        return this.actor.update({"data.injury.marks": marks});
    }

    _onChangeMark(event) {
        const data = this.actor.data.data;
        const marks = data.injury.marks;
        if (marks === 0) return false;
        let updateData = {"data.injury.marks": marks-1};
        if (data.injury.degrees.severe > 0) {
            const expectedMarks = data.injury.degrees.light + data.injury.degrees.serious + data.injury.degrees.severe * data.injury.degrees.severeMult;
            if (expectedMarks - (marks-1) === data.injury.degrees.severeMult) {
                updateData = {
                    ...updateData,
                    "data.injury.degrees.severe": data.injury.degrees.severe-1
                }
            }
        } else {
            if (data.injury.degrees.serious > 0) {
                updateData = {
                    ...updateData,
                    "data.injury.degrees.serious": data.injury.degrees.serious-1
                }
            } else {
                if (data.injury.degrees.light > 0) {
                    updateData = {
                        ...updateData,
                        "data.injury.degrees.light": data.injury.degrees.light-1
                    }
                }
            }
        }
        return this.actor.update(updateData);
    }

    _onChangeInjury(event) {
        event.preventDefault();
        const data = this.actor.data.data;
        const e = event.currentTarget;
        const classList = e.classList;
        const supEl = event.currentTarget.closest('.arrow-control');
        const supClassList = supEl.classList;
        let parameter;
        let marks;
        if(supClassList.contains('light')) {parameter = "light"; marks = 1}
        if(supClassList.contains('serious')) {parameter = "serious"; marks = 1}
        if(supClassList.contains('severe')) {parameter = "severe"; marks = data.injury.degrees.severeMult}
        if (!parameter) return false;

        const qtd = data.injury.degrees[parameter]
        const updatePath = `data.injury.degrees.${parameter}`;

        if (classList.contains("add")) {
            return this.actor.update({
                [updatePath]: qtd+1,
                "data.injury.marks": data.injury.marks + marks
            });
        }
        if (classList.contains("remove") && qtd > 0) {
            if (parameter === 'severe') {
                if (data.injury.marksExcess = 0) marks = marks;
                if (data.injury.marksExcess > 0) marks = -data.injury.marksExcess;
                if (data.injury.marksExcess < 0) marks = data.injury.marksExcess;
            }
            return this.actor.update({
                [updatePath]: qtd-1,
                "data.injury.marks": data.injury.marks - marks
            });
        } 
    };

    async _onWeaponGroupToggle(event) {
        event.preventDefault();
        const wgroupId = event.currentTarget.closest(".feature-controls").dataset.wgroupId.trim();
        const wgroups = await this.actor.data.data.wgroups;
        const hasGroup = wgroups.includes(wgroupId);
        if (hasGroup) {
            const pos = wgroups.indexOf(wgroupId);
            wgroups.splice(pos, 1);
        } else {
            wgroups.push(wgroupId);
        }
        return this.actor.update({"data.wgroups": wgroups});
    }

    _onChangeQuantity(event) {
        event.preventDefault();
        const e = event.currentTarget;
        const classList = e.classList;
        let itemId = e.closest(".feature-controls").dataset.itemId;
        const item = this.actor.items.get(itemId);
        const qtd = item.data.data.quantity;
        if (classList.contains("add")) return item.update({"data.quantity": qtd+1});
        if (classList.contains("remove") && qtd > 0) return item.update({"data.quantity": qtd-1});
    }

    _onToggleItemMod(event) {
        const data = event.currentTarget.dataset;
        const itemId = data.itemId;
        const modType = data.modType;
        const item = this.actor.items.get(itemId);
        const active = item.data.data.itemMods[modType].isActive;
        const dataPath = `data.itemMods.${modType}.isActive`;
        return item.update({[dataPath]: !active});
    }

    _onChangeCondition(event) {
        const isChecked = event.currentTarget.checked;
        const condId = event.currentTarget.closest(".feature-controls").dataset.conditionId;
        return this.actor.handleConditions(condId, isChecked);
    }

    _onTooltipHover(event){
        const tipCont = event.currentTarget.querySelector(".container-tooltip-text");
        const windowSize = {
            x: event.view.innerWidth,
            y: event.view.innerHeight
        };
        let xPos = event.clientX;
        let yPos = event.clientY;
        tipCont.style.top = `${yPos - tipCont.clientHeight - 5}px`;

        const xMargin = windowSize.x - (xPos + tipCont.clientWidth);
        if (xMargin < 0) xPos += xMargin;
        tipCont.style.left = `${xPos}px`;
    };

    _onAddEffect(event) {
        const newEffect = {
            label: game.i18n.localize("age-system.item.newItem"),
            origin: this.actor.uuid,
            icon: `icons/svg/aura.svg`,
            disabled: true,
            duration: {rounds: 1}
        };
        return this.actor.createEmbeddedDocuments("ActiveEffect", [newEffect]);
    }

    _onActiveEffect(event){
        const effectId = event.currentTarget.closest(".feature-controls").dataset.effectId;
        const effect = this.actor.effects.get(effectId);
        const isDisabled = effect.data.disabled;
        effect.update({"disabled": !isDisabled})
    }

    _onChangeEffect(event){
        const effectId = event.currentTarget.closest(".feature-controls").dataset.effectId;
        const effect = this.actor.effects.get(effectId);
        effect.sheet.render(true);
    }

    _onRemoveEffect(event){
        const effectId = event.currentTarget.closest(".feature-controls").dataset.effectId;
        const effect = this.actor.effects.get(effectId);
        return effect.delete();
    }

    _onItemActivate(event) {
        const itemId = event.currentTarget.closest(".feature-controls").dataset.itemId;
        const itemToToggle = this.actor.getEmbeddedDocument("Item", itemId);
        const itemType = itemToToggle.type;
        if (itemType === "power" || itemType === "talent") {
            const toggleAct = !itemToToggle.data.data.activate;
            itemToToggle.update({"data.activate": toggleAct});
        } else {
            const toggleEqp = !itemToToggle.data.data.equiped;
            itemToToggle.update({"data.equiped": toggleEqp});
        };
    };

    _onRollResources(event) {
        const rollData = {
            event: event,
            actor: this.actor,
            rollType: ageSystem.ROLL_TYPE.RESOURCES
        };
        Dice.ageRollCheck(rollData);
    };

    _onLastUpSelect(ev) {
        const abl = ev.currentTarget.closest(".feature-controls").dataset.ablId;
        let actorAbls = {
            data: {
                abilities: {}
            }
        };
        for (const ablKey in this.actor.data.data.abilities) {
            if (Object.hasOwnProperty.call(this.actor.data.data.abilities, ablKey)) {
                actorAbls.data.abilities[ablKey] = {"lastUp": false};                
            };
        };
        actorAbls.data.abilities[abl].lastUp = true;
        this.actor.update(actorAbls);
    };

    _onDefendSelect(event) {
        const guardupStatus = event.currentTarget.closest(".feature-controls").dataset.guardupActive;
        const defendStatus = this.actor.data.data.defend.active;
        if (guardupStatus && !defendStatus) {
            this.actor.update({"data.guardUp.active": false});
        };
    };

    _onGuardUpSelect(event) {
        const defendStatus = event.currentTarget.closest(".feature-controls").dataset.defendActive;
        const guardupStatus = this.actor.data.data.guardUp.active;
        if (!guardupStatus && defendStatus) {
            this.actor.update({"data.defend.active": false});
        };
    };

    _onRollAbility(event) {
        const rollData = {
            event: event,
            actor: this.actor,
            abl: event.currentTarget.closest(".feature-controls").dataset.ablId,
            rollType: ageSystem.ROLL_TYPE.ABILITY
        }
        Dice.ageRollCheck(rollData);
    };

    _onRollItem(event) {
        event.preventDefault();
        const itemId = event.currentTarget.closest(".feature-controls").dataset.itemId;
        const rollType = event.currentTarget.closest(".feature-controls").dataset.rollType
        const itemRolled = this.actor.items.get(itemId);
        if (itemRolled.data.type === "focus" && event.button !== 0) return
        itemRolled.roll(event, rollType);
    };

    _onItemShow(event) {
        event.preventDefault();
        const itemId = event.currentTarget.closest(".feature-controls").dataset.itemId;
        const item = this.actor.items.get(itemId);
        item.showItem(event.shiftKey);
    };

    _onItemEdit(event) {
        event.preventDefault();
        let e = event.currentTarget;
        let itemId = e.dataset.itemId ?? e.closest(".feature-controls").dataset.itemId;
        const item = this.actor.items.get(itemId);
        return item.sheet.render(true);
    };

    _onItemDelete(event) {
        event.preventDefault();
        let e = event.currentTarget;
        let itemId = e.closest(".feature-controls").dataset.itemId;
        const item = this.actor.items.get(itemId);
        return item.delete();
    };

    _onRollDamage(event) {
        event.preventDefault();
        const e = event.currentTarget;
        const itemId = e.closest(".feature-controls").dataset.itemId;
        const item = this.actor.items.get(itemId);
        const damageData = {event: event};
        return item.rollDamage(damageData);
    };

    focusContextMenu = [
        {
            name: game.i18n.localize("age-system.ageRollOptions"),
            icon: '<i class="fas fa-dice"></i>',
            callback: e => {
                const focus = this.actor.items.get(e.data("item-id"));
                const ev = new MouseEvent('click', {altKey: true});
                Dice.ageRollCheck({event: ev, itemRolled: focus, actor: this.actor, rollType: ageSystem.ROLL_TYPE.FOCUS});
            }
        },
        {
            name: game.i18n.localize("age-system.chatCard.roll"),
            icon: '<i class="far fa-eye"></i>',
            callback: e => {
                const i = this.actor.items.get(e.data("item-id")).showItem(e.shiftKey);
            }
        },
        {
            name: game.i18n.localize("age-system.settings.changeRollContext"),
            icon: '<i class="fas fa-exchange-alt"></i>',
            // TODO - try to add the Shift + Click rolling to GM inside this callback
            callback: e => {
                const focus = this.actor.items.get(e.data("item-id"));
                const ev = new MouseEvent('click', {});
                Dice.ageRollCheck({event: ev, itemRolled: focus, actor: this.actor, selectAbl: true, rollType: ageSystem.ROLL_TYPE.FOCUS});
            }
        },
        {
            name: game.i18n.localize("age-system.settings.edit"),
            icon: '<i class="fas fa-edit"></i>',
            callback: e => {
                const item = this.actor.items.get(e.data("item-id"));
                item.sheet.render(true);
            }
        },
        {
            name: game.i18n.localize("age-system.settings.delete"),
            icon: '<i class="fas fa-trash"></i>',
            callback: e => {
                const i = this.actor.items.get(e.data("item-id")).delete();
            }
        }
    ];
}