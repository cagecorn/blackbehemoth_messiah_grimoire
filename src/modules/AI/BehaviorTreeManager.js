// Simple Modular Behavior Tree Implementation
// States: 0 = SUCCESS, 1 = RUNNING, 2 = FAILED

export class Task {
    constructor(name = 'Task') {
        this.name = name;
    }
    run(agent, blackboard) {
        if (agent.btManager) agent.btManager.lastActiveNodeName = this.name;
        return 0;
    }
}

export class Selector extends Task {
    constructor(children, name = 'Selector') {
        super(name);
        this.children = children;
    }
    run(agent, blackboard) {
        if (agent.btManager) agent.btManager.lastActiveNodeName = this.name;
        // console.log(`[BT] Running Selector: ${this.name} for ${agent.unitName}`);
        for (let child of this.children) {
            let status = child.run(agent, blackboard);
            if (status !== 2) {
                return status;
            }
        }
        return 2;
    }
}

export class Sequence extends Task {
    constructor(children, name = 'Sequence') {
        super(name);
        this.children = children;
    }
    run(agent, blackboard) {
        if (agent.btManager) agent.btManager.lastActiveNodeName = this.name;
        for (let child of this.children) {
            let status = child.run(agent, blackboard);
            if (status !== 0) {
                return status;
            }
        }
        return 0;
    }
}

export class Condition extends Task {
    constructor(checkFn, name = 'Condition') {
        super(name);
        this.checkFn = checkFn;
    }
    run(agent, blackboard) {
        if (agent.btManager) agent.btManager.lastActiveNodeName = this.name;
        return this.checkFn(agent, blackboard) ? 0 : 2;
    }
}

export class Action extends Task {
    constructor(actionFn, name = 'Action') {
        super(name);
        this.actionFn = actionFn;
    }
    run(agent, blackboard) {
        if (agent.btManager) agent.btManager.lastActiveNodeName = this.name;
        return this.actionFn(agent, blackboard);
    }
}

export default class BehaviorTreeManager {
    constructor(agent, blackboard, rootNode) {
        this.agent = agent;
        this.blackboard = blackboard;
        this.rootNode = rootNode;
        this.lastActiveNodeName = 'Idle';
    }

    step() {
        if (this.rootNode) {
            // console.log(`[BT] Stepping for ${this.agent.unitName} - Root: ${this.rootNode.name}`);
            this.rootNode.run(this.agent, this.blackboard);
        }
    }
}
