export default class PartyManager {
    constructor(scene) {
        this.scene = scene;
        this.members = [];
    }

    addMember(characterData) {
        console.log('Adding party member:', characterData);
        this.members.push(characterData);
    }
}
