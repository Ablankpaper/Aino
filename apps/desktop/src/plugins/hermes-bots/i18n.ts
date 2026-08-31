/**
 * Plugin-scoped i18n for Bot Mode — bundles registered under the plugin id via
 * `ctx.i18n.register`, never touching core `en.ts`. Mirrors the kanban plugin:
 * `usePluginI18n` returns a stringly-typed `t(key, …)`, and `useBots()` binds it
 * to the message SHAPE so components keep typed `b.roster.search` access.
 *
 * Only strings Bot Mode OWNS live here. Generic verbs (Cancel, Delete, Remove,
 * Retry, Close, Loading…) and shared vocabulary core already ships in every
 * locale — weekday names, Daily/Hourly, Scheduled jobs — resolve against core
 * via `useI18n()` / `translateNow()`. Duplicating those here would be a
 * second, worse translation that drifts.
 *
 * Three kinds of literal deliberately stay hardcoded, and none of them is a
 * missed key:
 *
 *  - **Prompts sent to a model**, not shown as chrome: the room-picture image
 *    prompt and the scheduled-routine instruction. They are addressed to the
 *    model, which reads English best.
 *  - **Syntax and identifiers**: cron expressions and their examples, React
 *    keys, workspace ids.
 *  - **`'You'`**, the author marker on room-log entries. It is persisted into
 *    the log and compared as a sentinel (`group-activity.ts`), so translating
 *    it in place would break both. Localizing it needs the marker and its
 *    rendering split apart — worth doing, not doable as a rename.
 *
 * Locales follow kanban: `en` / `ja` / `zh` / `zh-hant`. Arabic falls through
 * the resolution chain (active locale → this plugin's `en` → the key) the
 * same way a missing string in any locale does. Nouns match core: ボット /
 * 机器人 / 機器人, プロファイル / 配置档案 / 設定檔, ゲートウェイ / 网关 / 閘道.
 */

import { type PluginLocaleBundles, type PluginTranslate, usePluginI18n } from '@hermes/plugin-sdk'
import { useMemo } from 'react'

import { getPluginCtx } from './shared'

type BotsMessages = {
  /** Left rail: the bot + group-chat roster. */
  roster: {
    title: string
    search: string
    searchPlaceholder: string
    newBotOrGroup: string
    groupChats: string
    emptyTitle: string
    emptyDesc: string
    noMatchQuery: (query: string) => string
    noMatchQueryOn: (query: string, gateway: string) => string
    noMatchFiltersOn: (gateway: string) => string
    noMatchFilters: string
    clearFilters: string
    newMenu: string
    activityToastsOn: string
    activityToastsOff: string
    filterRoster: string
    filterRosterActive: (count: number) => string
    globalGroupChats: (count: number) => string
    currentGateway: string
    staleRefresh: string
    staleWaiting: string
    gatewayError: string
    deleteDescription: (name: string, path: string) => string
    deletedProfile: (name: string) => string
    deletedGroup: (name: string) => string
    deleting: string
    deleted: string
    allGateways: string
    hidden: string
    allHidden: string
    allHiddenDesc: string
    showHidden: string
    noHiddenMatch: string
    hiddenFromRoster: string
    pinned: string
    needsAttention: string
    needsInput: string
    /** The kind filter's three options, in menu order. */
    botsAndGroups: string
    botsOnly: string
    groupsOnly: string
    /** The activity filter's four options, in menu order. */
    anyActivity: string
    activeNow: string
    recentlyActive: string
    older: string
    /** How a row's owning gateway is doing — see `botSourceStatus`. */
    gatewayRemoved: string
    onDemand: string
    ready: string
    statusUnknown: string
    unavailable: string
    retryNow: string
    rosterUnavailable: (reason: string) => string
    waitingForGateway: string
  }
  /** Creating, editing and removing a bot. */
  bot: {
    newTitle: string
    editTitle: string
    editMenu: string
    helpPromptPlaceholder: string
    descriptionHint: string
    newChatWith: string
    /** Re-opens the forever-chat on purpose. A plain row click only returns to
     *  the tabs already open, so a closed Bot Chat needs an explicit ask. */
    openBotChat: string
    duplicate: string
    duplicateFailed: string
    deleteTitle: string
    removeFromAllGroups: string
    createFirstHint: string
    createFailed: string
    advanced: string
    advancedHint: string
    advancedFailed: string
    openAnotherChatUnsupported: string
    remoteConnectionsUnsupported: string
    /** Stands under the bot's name in a chat it has not spoken in yet. */
    chatEmpty: string
    /** First line of a brand-new bot's forever-chat — see `kickoffText`. */
    kickoff: string
    pinToTop: string
    unpin: string
    hide: string
    unhide: string
    pinnedNotice: (name: string) => string
    unpinnedNotice: (name: string) => string
    hiddenNotice: (name: string) => string
    unhiddenNotice: (name: string) => string
    metadataLoadFailed: string
    loadFailed: string
    groupsLoadFailed: string
    manageGroups: string
    groupsLabel: (groups: string) => string
    duplicating: (name: string) => string
    duplicated: (name: string, source: string) => string
    attentionProviderAuth: string
    attentionQuota: string
    attentionMissingConfig: string
    attentionBlocked: string
    attentionGeneric: string
    createDescription: string
    descriptionLabel: string
    createOn: string
    currentSuffix: string
    titlePlaceholder: string
    namePlaceholder: string
    fullConfigUnsupported: string
    remoteCapabilitiesHint: string
    soulConfigLabel: string
    skillsEnabled: (enabled: number, total: number) => string
    toolsetsEnabled: (enabled: number, total: number) => string
    mcpServers: string
    remoteCreateHint: (target: string) => string
    capabilitiesImmediate: string
    appearanceDescription: (name: string, slug: string) => string
    sectionsFailed: (sections: string) => string
    updated: (name: string) => string
    draftDiscarded: (name: string) => string
    draftCleanupFailed: (name: string) => string
    nameTaken: (slug: string) => string
    nameTakenOn: (slug: string, target: string) => string
    general: string
    capabilities: string
    skills: string
    tools: string
    mcp: string
    cloneFromRemote: (target: string) => string
    freshProfile: string
    inheritedModel: string
    soulLabel: string
    shareAuth: string
    shareAuthDescription: string
    noSkills: string
    capabilitiesNameTaken: string
    capabilitiesNameHint: string
    skillsUnsupported: string
    catalogUnsupported: string
    emptySkills: string
    catalogFrom: (source: string) => string
    toolsetHint: string
    mcpHint: string
    catalogInstalled: string
    catalog: string
    createAction: string
    creating: string
  }
  /** Avatar picker: shapes, blobs, pets, uploads, generation. */
  avatar: {
    classicShapes: string
    blobFromName: string
    unlockFollowsName: string
    randomize: string
    auto: string
    autoTitle: string
    /** The picker's four tabs, in order. */
    tabBot: string
    tabGenerate: string
    upload: string
    tabPet: string
    removeImage: string
    removeBackToShape: string
    describePlaceholder: string
    describeHint: string
    matchTheName: string
    pickPet: string
    petLoadFailed: string
    imageTooLarge: string
    generationFailed: string
    savedLocally: string
    savedLocallyDescriptionFailed: string
    generate: string
    generating: string
    keepExactFace: string
    lockFace: string
    unlockFace: string
    faceLocked: string
    faceFollowsName: string
    noImageModel: string
    checkingImageBackend: string
    chooseImage: string
  }
  /** Group chats: the room, its composer, threads and activity feed. */
  group: {
    newTitle: string
    manageDesc: string
    manageTitle: string
    settingsTitle: string
    settingsDesc: string
    nameLabel: string
    searchToAdd: string
    searchToAddPlaceholder: string
    removeFromSelection: string
    disbandTitle: string
    deleteTitle: string
    deleteAction: string
    composerPlaceholder: string
    attachHint: string
    newThread: string
    reply: string
    replyInThread: string
    replyInThreadPlaceholder: string
    openThread: string
    collapseThread: string
    collapseThreadLabel: string
    activity: string
    noActivityYet: string
    showActivity: string
    hideActivity: string
    stop: string
    stopHint: string
    allHeldStatus: (count: number) => string
    heldMembersStatus: (members: string) => string
    holdReleaseHint: string
    needsYourInput: string
    pictureGenerationFailed: string
    nameTaken: (name: string) => string
    memberCount: (count: number) => string
    settingsHint: (group: string) => string
    settingsLabel: (group: string) => string
    disbandHint: (group: string) => string
    disbandLabel: (group: string) => string
    disbandAction: string
    disbanding: string
    disbandDone: string
    disbanded: (group: string) => string
    /** Wraps the bolded group name, so the name can lead the sentence in
     *  languages that put it there — see core's cron.deleteDesc* pair. */
    disbandDescPrefix: string
    disbandDescSuffix: (count: number) => string
    stopped: (group: string) => string
    removeAttachment: string
    threadFallback: string
    replyCount: (replies: number) => string
    dropToThread: string
    dropToRoom: string
    waitingForAnswer: string
    memberThinking: (name: string) => string
    roomWorking: string
    messageRoom: (group: string) => string
    newThreadPlaceholder: (group: string) => string
    everyoneMeta: string
    commandApproval: string
    answerFailed: (handle: string, error: string) => string
    wantsToRunCommand: (handle: string) => string
    asks: (handle: string) => string
    answerTo: (member: string) => string
    openGroupChat: string
    you: string
    botCount: (count: number) => string
    availability: (available: number, total: number) => string
    noBotsInChat: string
    back: string
    hideFullHandle: string
    showFullHandle: string
    attachedFile: string
    attachedImage: string
    answerWithChoices: string
    answerPlaceholder: string
    answerOwnPlaceholder: string
    sending: string
    respond: string
    answer: string
    newDescription: (max: number) => string
    createAndJoin: string
    newGroupPlaceholder: string
    groupNameExample: string
    createdWith: (name: string, count: number) => string
    noBotsMatch: (query: string) => string
    noBotsYet: string
    pickAtLeast: (count: number) => string
    activityToastsTip: string
  }
  /** Skills hub + MCP setup surfaces embedded in the bot editor. */
  tools: {
    skillsHub: string
    filterSkills: string
    searchHub: string
    noMcpServers: string
    noHubMatch: string
    working: string
    browseHub: string
    hideHub: string
    hubHint: string
    searching: string
    added: string
    installing: (name: string) => string
    installFailed: (name: string) => string
  }

  /** Inline MCP server setup states. */
  mcp: {
    setupNeeded: (requires: string) => string
    setupDone: string
    saveTest: string
    authorizing: string
    setupFailed: string
    retry: string
    signIn: string
    setUp: string
    completeSignIn: string
    noTargetProfile: string
    couldNotAddServer: string
    failedToSet: (key: string) => string
    configured: (name: string) => string
    serverTestFailed: string
    oauthStartFailed: string
    oauthCallbackFailed: string
    oauthFailed: string
    authenticated: (name: string) => string
  }

  /** Provider/model picker copy that is not present in core model settings. */
  model: {
    providerLabel: string
    modelLabel: string
    providerCustom: string
    modelCustom: string
    providerPlaceholder: string
    modelPlaceholder: string
    providerCustomPlaceholder: string
    modelCustomPlaceholder: string
    gatewayDefault: string
    backToDropdowns: string
    inheritLaunch: string
    enterManually: string
    modelNamePlaceholder: string
  }

  /** Bot-scoped scheduled jobs. Generic scheduling chrome (weekday names,
   *  Daily/Hourly, the job verbs) resolves against core's `cron` section. */
  cron: {
    filterHint: string
    needsRosterFirst: string
    staleNotice: string
    readFailure: string
    createDesc: (bot: string) => string
    instruction: string
    whenToRun: string
    dayOfMonth: string
    sendResultsTo: string
    runHistoryOnly: string
    botChatTarget: (bot: string) => string
    continuity: string
    onceIn: (when: string) => string
    everyNDays: (days: number) => string
    everyNHours: (hours: number) => string
    everyNMinutes: (minutes: number) => string
    /** The frequency picker's eight options, in menu order. */
    freqOnce: string
    freqHourly: string
    freqDaily: string
    freqWeekdays: string
    freqWeekly: string
    freqMonthly: string
    freqInterval: string
    freqAdvanced: string
    unitMinutes: string
    unitHours: string
    unitDays: string
    /** One-line plain-language read-back of the picker's current state. */
    runsOnce: (count: number, unit: string) => string
    runsHourly: string
    runsDaily: (time: string) => string
    runsWeekdays: (time: string) => string
    runsWeekly: (day: string, time: string) => string
    runsMonthly: (day: string, time: string) => string
    runsInterval: (count: number, unit: string) => string
    runsRaw: string
    timesTotal: (count: number) => string
    jobDescription: string
    stopAfter: string
    runsForever: string
    detailStatus: string
    detailSchedule: string
    detailScheduleRaw: string
    detailRepeat: string
    detailNextRun: string
    detailLastRun: string
    detailLastResult: string
    detailDeliversTo: string
    detailModel: string
    detailWorkingDirectory: string
    pausedSecurity: string
    onceMinutes: string
    onceHours: string
    onceDays: string
  }
}

const en: BotsMessages = {
  roster: {
    title: 'Bots',
    search: 'Search bots and group chats',
    searchPlaceholder: 'Search bots and group chats…',
    newBotOrGroup: 'New bot or group chat',
    groupChats: 'Group chats',
    emptyTitle: 'No bots yet',
    emptyDesc: 'Create your first bot.',
    noMatchQuery: query => `No bots or group chats match “${query}”`,
    noMatchQueryOn: (query, gateway) => `No bots or group chats match “${query}” on ${gateway}`,
    noMatchFiltersOn: gateway => `No bots or group chats match these filters on ${gateway}`,
    noMatchFilters: 'No bots or group chats match these filters.',
    clearFilters: 'Clear filters',
    newMenu: 'New…',
    activityToastsOn: 'Activity toasts on — click to silence',
    activityToastsOff: 'Activity toasts off — click to enable',
    filterRoster: 'Filter roster',
    filterRosterActive: count => `Filter roster, ${count} active`,
    globalGroupChats: count => `${count} global group chat${count === 1 ? '' : 's'}`,
    currentGateway: 'Current gateway',
    staleRefresh: 'Roster refresh failed — showing the last good list.',
    staleWaiting: 'Waiting for the gateway to reconnect…',
    gatewayError: 'gateway error',
    deleteDescription: (name, path) =>
      `This will permanently delete the bot ${name} and its associated Hermes profile at ${path}. This cannot be undone.`,
    deletedProfile: name => `Deleted profile ${name}`,
    deletedGroup: name => `Deleted group “${name}”`,
    deleting: 'Deleting…',
    deleted: 'Deleted',
    allGateways: 'All gateways',
    hidden: 'Hidden',
    allHidden: 'All bots are hidden',
    allHiddenDesc: 'They keep working and retain their history.',
    showHidden: 'Show hidden bots',
    noHiddenMatch: 'No hidden bots match these filters.',
    hiddenFromRoster: 'Hidden from the roster',
    pinned: 'Pinned',
    needsAttention: 'needs attention',
    needsInput: 'Needs your input',
    botsAndGroups: 'Bots and group chats',
    botsOnly: 'Bots only',
    groupsOnly: 'Group chats only',
    anyActivity: 'Any activity',
    activeNow: 'Active now',
    recentlyActive: 'Recently active',
    older: 'Older',
    gatewayRemoved: 'Gateway removed',
    onDemand: 'On demand',
    ready: 'Ready',
    statusUnknown: 'Status unknown',
    unavailable: 'Unavailable',
    retryNow: 'Retry now',
    rosterUnavailable: reason =>
      `Roster unavailable: ${reason}. If your gateway predates profiles.list, update Hermes and restart the gateway.`,
    waitingForGateway:
      'Waiting for the gateway connection… (remote gateways can take a few seconds; retries automatically)'
  },
  bot: {
    newTitle: 'New bot',
    editTitle: 'Edit profile',
    editMenu: 'Edit…',
    helpPromptPlaceholder: 'What should this bot help with?',
    descriptionHint: 'Leave blank to generate from the bot’s name and description.',
    newChatWith: 'New chat with this bot',
    openBotChat: 'Open Bot Chat',
    duplicate: 'Duplicate',
    duplicateFailed: 'Duplicate failed',
    deleteTitle: 'Delete bot and profile?',
    removeFromAllGroups: 'Remove from all groups',
    createFirstHint: 'Open the Bots pane and hit “New Bot”.',
    createFailed: 'Could not create the profile yet',
    advanced: 'Advanced',
    advancedHint: 'Advanced — model, skills, toolsets, SOUL.md',
    advancedFailed: 'Advanced configuration failed',
    openAnotherChatUnsupported: 'Update Hermes Desktop to open another Bot chat.',
    remoteConnectionsUnsupported: 'Update Hermes Desktop to chat with bots on other connections.',
    chatEmpty: 'Say something to get started.',
    kickoff: 'Hey, tell me about yourself!',
    pinToTop: 'Pin to top',
    unpin: 'Unpin',
    hide: 'Hide',
    unhide: 'Unhide',
    pinnedNotice: name => `${name} pinned to top`,
    unpinnedNotice: name => `${name} unpinned`,
    hiddenNotice: name => `${name} hidden — use the eye button in the Bots header to see hidden bots`,
    unhiddenNotice: name => `${name} is back in the roster`,
    metadataLoadFailed: 'Could not load bot metadata',
    loadFailed: 'Could not load bot',
    groupsLoadFailed: 'Could not load bot groups',
    manageGroups: 'Manage groups…',
    groupsLabel: groups => `Groups: ${groups}…`,
    duplicating: name => `Duplicating ${name}…`,
    duplicated: (name, source) => `Created ${name} — full copy of ${source}`,
    attentionProviderAuth: 'Sign in again for this profile',
    attentionQuota: 'Quota or balance exhausted',
    attentionMissingConfig: 'Provider not configured — run hermes model',
    attentionBlocked: 'Bot is blocked — see its last message',
    attentionGeneric: 'Needs attention',
    createDescription: 'A named teammate with its own memory, skills, and chat. It can message your other agents.',
    descriptionLabel: 'Description',
    createOn: 'Create on',
    currentSuffix: 'current',
    titlePlaceholder: 'Inbox Triage',
    namePlaceholder: 'inbox-triage',
    fullConfigUnsupported: 'Full configuration needs a newer gateway (restart it after updating Hermes).',
    remoteCapabilitiesHint:
      'Remote capabilities require a newer desktop. Model and SOUL changes remain staged until you save.',
    soulConfigLabel: 'SOUL.md (persona + agent-messaging protocol)',
    skillsEnabled: (enabled, total) => `Skills (${enabled}/${total} enabled)`,
    toolsetsEnabled: (enabled, total) => `Toolsets (${enabled}/${total} enabled — unchecking all restores the default)`,
    mcpServers: 'MCP servers',
    remoteCreateHint: target =>
      `The agent is created on ${target} and appears in the roster as a Connections bot. Chat routes to that machine.`,
    capabilitiesImmediate: 'Capabilities (applies immediately — skills, tools, MCP)',
    appearanceDescription: (name, slug) => `Appearance and role for ${name} (${slug}).`,
    sectionsFailed: sections => `Some sections failed: ${sections}`,
    updated: name => `${name} updated`,
    draftDiscarded: name => `Draft agent "${name}" discarded`,
    draftCleanupFailed: name => `Could not clean up draft profile "${name}"`,
    nameTaken: slug => `An agent named "${slug}" already exists.`,
    nameTakenOn: (slug, target) => `An agent named "${slug}" already exists on ${target}.`,
    general: 'General',
    capabilities: 'Capabilities',
    skills: 'Skills',
    tools: 'Tools',
    mcp: 'MCP',
    cloneFromRemote: target => `Clone from profile (on ${target})`,
    freshProfile: 'Fresh profile (bundled skills)',
    inheritedModel: 'inherited from launch profile',
    soulLabel: 'SOUL.md (optional — replaces the generated persona)',
    shareAuth: 'Share keys & accounts with the main profile',
    shareAuthDescription:
      'Subscriptions, OAuth logins, and API keys stay shared (not copied), so token refreshes never invalidate each other. Uncheck for an isolated snapshot copy.',
    noSkills: 'Create empty (skip bundled skills)',
    capabilitiesNameTaken: 'That name is taken — pick another before configuring capabilities.',
    capabilitiesNameHint:
      'Name the bot first — a draft profile is created when you open this tab (discarded if you cancel).',
    skillsUnsupported: 'Skills need a newer Hermes Desktop.',
    catalogUnsupported: 'Capability catalog needs a newer gateway (restart it after updating Hermes).',
    emptySkills: '“Create empty” is checked — no bundled skills will be installed.',
    catalogFrom: source => `Catalog from ${source} — unchecked skills are disabled after creation.`,
    toolsetHint: 'Leaving all (or none) checked keeps the default toolset behavior.',
    mcpHint:
      'Configured servers copy from the main profile; catalog entries are the bundled MCP menu. Entries needing API keys route through setup first (credentials follow the shared keys setting).',
    catalogInstalled: 'catalog · installed',
    catalog: 'catalog',
    createAction: 'Create Bot',
    creating: 'Creating…'
  },
  avatar: {
    classicShapes: 'Classic shapes',
    blobFromName: 'Blob face — drawn from the bot’s name',
    unlockFollowsName: 'Unlock — the face follows the bot’s name again',
    randomize: 'Randomize',
    auto: 'Auto',
    autoTitle: 'Auto — the name decides',
    tabBot: 'Bot',
    tabGenerate: 'Generate',
    upload: 'Upload',
    tabPet: 'Pet',
    removeImage: 'Remove image — use shape',
    removeBackToShape: 'Remove — back to shape avatar',
    describePlaceholder: 'Describe your avatar…',
    describeHint: 'Leave blank to auto-generate from name/title/description + agent-messaging roster.',
    matchTheName: 'Match the name',
    pickPet: 'Pick a pet as this bot’s profile picture.',
    petLoadFailed: 'Could not load that pet — try another.',
    imageTooLarge: 'Image too large (max 15MB).',
    generationFailed: 'Avatar generation failed',
    savedLocally: 'Saved look locally; remote persistence failed',
    savedLocallyDescriptionFailed: 'Saved look locally; description update failed',
    generate: 'Generate',
    generating: 'Generating…',
    keepExactFace: 'Keep this exact face even if the name changes',
    lockFace: 'Lock face',
    unlockFace: 'Unlock',
    faceLocked: 'Face locked — renaming won’t change it.',
    faceFollowsName: 'Face follows the name.',
    noImageModel:
      'No image model available. If you just enabled one (or updated Hermes), restart the gateway: Ctrl+K → "Restart gateway".',
    checkingImageBackend: 'Checking image backend…',
    chooseImage: 'Choose an image…'
  },
  group: {
    newTitle: 'New group chat',
    manageDesc: 'A bot can join multiple group chats. Memberships sync to every machine.',
    manageTitle: 'Manage groups',
    settingsTitle: 'Group settings',
    settingsDesc: 'Rename the group or set a room picture. Members and history are kept.',
    nameLabel: 'Group name',
    searchToAdd: 'Search bots to add',
    searchToAddPlaceholder: 'Search bots to add…',
    removeFromSelection: 'Remove from selection',
    disbandTitle: 'Disband group chat?',
    deleteTitle: 'Delete group chat?',
    deleteAction: 'Delete',
    composerPlaceholder: 'Say something — every bot in this group hears the room.',
    attachHint: 'Attach files — every responding bot sees them',
    newThread: 'New Thread',
    reply: 'Reply',
    replyInThread: 'Reply in thread',
    replyInThreadPlaceholder: 'Reply in thread…',
    openThread: 'Open this thread',
    collapseThread: 'Collapse thread',
    collapseThreadLabel: 'Collapse this thread',
    activity: 'Activity',
    noActivityYet: 'No activity in this turn yet.',
    showActivity: 'Show room activity',
    hideActivity: 'Hide room activity',
    stop: 'Stop',
    stopHint: 'Stop this run — interrupts the member on turn and holds the rest',
    allHeldStatus: count => `All ${count} bots are paused`,
    heldMembersStatus: members => `Paused: ${members}`,
    holdReleaseHint: 'Mention a paused bot or send @all resume to release them.',
    needsYourInput: 'A bot in this group chat needs your input',
    pictureGenerationFailed: 'Group picture generation failed',
    nameTaken: name => `A group named “${name}” already exists.`,
    memberCount: count => `${count} bots`,
    settingsHint: group => `Group settings — rename ${group} or set a room picture`,
    settingsLabel: group => `Group settings for ${group}`,
    disbandHint: group => `Disband the ${group} group chat`,
    disbandLabel: group => `Disband ${group}`,
    disbandAction: 'Disband',
    disbanding: 'Disbanding…',
    disbandDone: 'Disbanded',
    disbanded: group => `Disbanded “${group}”`,
    disbandDescPrefix: 'This removes the ',
    disbandDescSuffix: count =>
      ` grouping from its ${count} bots and clears the shared room log. The bots themselves and their per-group sessions are kept.`,
    stopped: group => `Stopped ${group} — remaining turns are held until you resume`,
    removeAttachment: 'Remove attachment',
    threadFallback: 'Thread',
    replyCount: replies => `${replies} ${replies === 1 ? 'reply' : 'replies'}`,
    dropToThread: 'Drop to attach to this thread reply',
    dropToRoom: 'Drop to attach — every responding bot sees it',
    waitingForAnswer: 'Waiting for your answer…',
    memberThinking: name => `${name} is thinking…`,
    roomWorking: 'The room is working…',
    messageRoom: group => `Message ${group}`,
    newThreadPlaceholder: group => `New thread in ${group}… (@name to direct, @everyone for all)`,
    everyoneMeta: 'Every bot in the room',
    commandApproval: 'command approval',
    answerFailed: (handle, error) => `Could not send the answer to @${handle}: ${error}`,
    wantsToRunCommand: handle => `@${handle} wants to run a command:`,
    asks: handle => `@${handle} asks:`,
    answerTo: member => `Answer @${member}`,
    openGroupChat: 'Open Group Chat',
    you: 'You',
    botCount: count => `${count} bots`,
    availability: (available, total) => `${available} of ${total} available`,
    noBotsInChat: 'No bots in this group chat',
    back: 'Back',
    hideFullHandle: 'Hide full handle',
    showFullHandle: 'Show full handle',
    attachedFile: 'attached file',
    attachedImage: 'attached image',
    answerWithChoices: 'Or type your own answer…',
    answerPlaceholder: 'Type your answer…',
    answerOwnPlaceholder: 'Or type your own answer…',
    sending: 'Sending…',
    respond: 'Respond',
    answer: 'Answer',
    newDescription: max =>
      `Pick 2–${max} bots. Local memberships sync through each Bot profile; cross-machine members stay scoped to this room.`,
    createAndJoin: 'Create & join',
    newGroupPlaceholder: 'New group…',
    groupNameExample: 'Group name (e.g. Research)',
    createdWith: (name, count) => `“${name}” created with ${count} bots`,
    noBotsMatch: query => `No bots match “${query}”`,
    noBotsYet: 'No bots yet — create one first.',
    pickAtLeast: count => `Pick at least ${count} bots`,
    activityToastsTip: 'Activity toasts'
  },
  tools: {
    skillsHub: 'Hermes Skills Hub',
    filterSkills: 'Filter skills…',
    searchHub: 'Search the hub (community + well-known sources)…',
    noMcpServers: 'No MCP servers configured or in the catalog.',
    noHubMatch: 'No hub skills matched.',
    working: 'Working…',
    browseHub: 'browse the full hub ▾',
    hideHub: 'hide the hub browser',
    hubHint:
      'Hit "+ Add to this Agent" on any skill — it installs and appears in the list above. Drag the corner to resize.',
    searching: 'Searching community + well-known sources — can take ~10s…',
    added: '✓ added',
    installing: name => `Installing "${name}"…`,
    installFailed: name => `Installing "${name}" failed`
  },
  mcp: {
    setupNeeded: requires => `Needs setup (${requires}) — restart the gateway to enable in-app setup`,
    setupDone: 'Set up ✓',
    saveTest: 'Save & test',
    authorizing: 'Authorizing…',
    setupFailed: 'Setup failed',
    retry: 'retry',
    signIn: 'Sign in…',
    setUp: 'Set up…',
    completeSignIn: 'Complete sign-in in your browser…',
    noTargetProfile: 'No target profile',
    couldNotAddServer: 'Could not add server',
    failedToSet: key => `Failed to set ${key}`,
    configured: name => `${name} configured`,
    serverTestFailed: 'Server test failed after setup',
    oauthStartFailed: 'Could not start OAuth',
    oauthCallbackFailed: 'OAuth callback relay failed',
    oauthFailed: 'OAuth failed',
    authenticated: name => `${name} authenticated`
  },
  model: {
    providerLabel: 'Provider',
    modelLabel: 'Model',
    providerCustom: 'Provider (Custom)',
    modelCustom: 'Model (Custom)',
    providerPlaceholder: 'omnirouter / 9router / nous …',
    modelPlaceholder: 'antigravity/gemini-3.6-flash-high',
    providerCustomPlaceholder: 'e.g. omnirouter, inferx, 9router',
    modelCustomPlaceholder: 'e.g. antigravity/gemini-3.6-flash-high',
    gatewayDefault: 'gateway default',
    backToDropdowns: '← Back to dropdowns',
    inheritLaunch: 'Inherit (launch profile)',
    enterManually: '✏️ Enter manually…',
    modelNamePlaceholder: 'e.g. model name'
  },
  cron: {
    filterHint:
      'Scheduled jobs exist in this profile but none are tagged for this bot. Name a job "[bot:<name>] …" to show it here, or see them in Cron below.',
    needsRosterFirst: 'This bot has to appear in the roster first.',
    staleNotice: 'Could not refresh scheduled jobs. Showing the last list we had.',
    readFailure: 'The list may still be there — this was a read failure, not a delete.',
    createDesc: bot => `A recurring task ${bot} runs on a schedule. Runs land in its own chat history.`,
    instruction: 'Instruction',
    whenToRun: 'When to run',
    dayOfMonth: 'Day of month',
    sendResultsTo: 'Send results to',
    runHistoryOnly: 'Run history only',
    botChatTarget: bot => `${bot}’s chat (bot responds)`,
    continuity: 'Continuity: each run sees the previous run’s output (dedupe, continue where it left off)',
    onceIn: when => `Once (${when})`,
    everyNDays: days => `Every ${days} days`,
    everyNHours: hours => `Every ${hours}h`,
    everyNMinutes: minutes => `Every ${minutes}m`,
    freqOnce: 'Once, in…',
    freqHourly: 'Every hour',
    freqDaily: 'Every day',
    freqWeekdays: 'Weekdays',
    freqWeekly: 'Every week',
    freqMonthly: 'Every month',
    freqInterval: 'Interval',
    freqAdvanced: 'Advanced…',
    unitMinutes: 'minute(s)',
    unitHours: 'hour(s)',
    unitDays: 'day(s)',
    runsOnce: (count, unit) => `Runs once, ${count} ${unit} from now`,
    runsHourly: 'Runs at the top of every hour',
    runsDaily: time => `Runs every day at ${time}`,
    runsWeekdays: time => `Runs Monday–Friday at ${time}`,
    runsWeekly: (day, time) => `Runs every ${day} at ${time}`,
    runsMonthly: (day, time) => `Runs on day ${day} of each month at ${time}`,
    runsInterval: (count, unit) => `Runs every ${count} ${unit}`,
    runsRaw: 'Raw schedule — every Nm/Nh/Nd or 5-field cron',
    timesTotal: count => `, ${count} time(s) total`,
    jobDescription: 'What this job runs, and when it runs next.',
    stopAfter: 'Stop after',
    runsForever: 'runs (blank = forever)',
    detailStatus: 'Status',
    detailSchedule: 'Schedule',
    detailScheduleRaw: 'Schedule (raw)',
    detailRepeat: 'Repeat',
    detailNextRun: 'Next run',
    detailLastRun: 'Last run',
    detailLastResult: 'Last result',
    detailDeliversTo: 'Delivers to',
    detailModel: 'Model',
    detailWorkingDirectory: 'Working directory',
    pausedSecurity: 'Paused for security: delete and recreate this legacy job before running it again.',
    onceMinutes: 'minutes from now',
    onceHours: 'hours from now',
    onceDays: 'days from now'
  }
}

const ja: BotsMessages = {
  roster: {
    title: 'ボット',
    search: 'ボットとグループチャットを検索',
    searchPlaceholder: 'ボットとグループチャットを検索…',
    newBotOrGroup: '新しいボットまたはグループチャット',
    groupChats: 'グループチャット',
    emptyTitle: 'ボットはまだありません',
    emptyDesc: '最初のボットを作成しましょう。',
    noMatchQuery: query => `「${query}」に一致するボットやグループチャットはありません`,
    noMatchQueryOn: (query, gateway) => `${gateway} に「${query}」に一致するボットやグループチャットはありません`,
    noMatchFiltersOn: gateway => `${gateway} にこれらのフィルタに一致するボットやグループチャットはありません`,
    noMatchFilters: 'これらのフィルタに一致するボットやグループチャットはありません。',
    clearFilters: 'フィルタをクリア',
    newMenu: '新規…',
    activityToastsOn: 'アクティビティ通知オン — クリックで消音',
    activityToastsOff: 'アクティビティ通知オフ — クリックで有効化',
    filterRoster: '名簿を絞り込み',
    filterRosterActive: count => `名簿を絞り込み（${count}件有効）`,
    globalGroupChats: count => `全体グループチャット${count === 1 ? '' : '（' + count + '）'}`,
    currentGateway: '現在のゲートウェイ',
    staleRefresh: '名簿の更新に失敗しました。最後に取得した一覧を表示しています。',
    staleWaiting: 'ゲートウェイの再接続を待っています…',
    gatewayError: 'ゲートウェイエラー',
    deleteDescription: (name, path) =>
      `ボット${name}と関連するHermesプロファイル（${path}）を完全に削除します。この操作は取り消せません。`,
    deletedProfile: name => `プロファイル${name}を削除しました`,
    deletedGroup: name => `グループ「${name}」を削除しました`,
    deleting: '削除中…',
    deleted: '削除しました',
    allGateways: 'すべてのゲートウェイ',
    hidden: '非表示',
    allHidden: 'すべてのボットが非表示です',
    allHiddenDesc: '非表示でも動作を続け、履歴も残ります。',
    showHidden: '非表示のボットを表示',
    noHiddenMatch: 'これらのフィルタに一致する非表示ボットはありません。',
    hiddenFromRoster: '名簿から非表示',
    pinned: 'ピン留め',
    needsAttention: '要対応',
    needsInput: '入力が必要です',
    botsAndGroups: 'ボットとグループチャット',
    botsOnly: 'ボットのみ',
    groupsOnly: 'グループチャットのみ',
    anyActivity: 'すべてのアクティビティ',
    activeNow: '現在アクティブ',
    recentlyActive: '最近アクティブ',
    older: '以前',
    gatewayRemoved: 'ゲートウェイが削除されました',
    onDemand: 'オンデマンド',
    ready: '準備完了',
    statusUnknown: '状態不明',
    unavailable: '利用できません',
    retryNow: '今すぐ再試行',
    rosterUnavailable: reason =>
      `名簿を取得できません: ${reason}。ゲートウェイが profiles.list より前の場合は、Hermes を更新してゲートウェイを再起動してください。`,
    waitingForGateway: 'ゲートウェイ接続を待っています…（リモートは数秒かかることがあります。自動で再試行します）'
  },
  bot: {
    newTitle: '新しいボット',
    editTitle: 'プロファイルを編集',
    editMenu: '編集…',
    helpPromptPlaceholder: 'このボットは何を手伝いますか？',
    descriptionHint: '空欄のままにすると、ボットの名前と説明から生成します。',
    newChatWith: 'このボットと新しいチャット',
    openBotChat: 'ボットチャットを開く',
    duplicate: '複製',
    duplicateFailed: '複製に失敗しました',
    deleteTitle: 'ボットとプロファイルを削除しますか？',
    removeFromAllGroups: 'すべてのグループから外す',
    createFirstHint: 'ボットパネルを開いて「新しいボット」を押してください。',
    createFailed: 'プロファイルをまだ作成できませんでした',
    advanced: '詳細設定',
    advancedHint: '詳細設定 — モデル、スキル、ツールセット、SOUL.md',
    advancedFailed: '詳細設定に失敗しました',
    openAnotherChatUnsupported: '別のボットチャットを開くには Hermes Desktop を更新してください。',
    remoteConnectionsUnsupported: '他の接続上のボットとチャットするには Hermes Desktop を更新してください。',
    chatEmpty: '何か書いて始めましょう。',
    kickoff: 'こんにちは、自己紹介をしてください！',
    pinToTop: '上部にピン留め',
    unpin: 'ピン留めを解除',
    hide: '非表示',
    unhide: '再表示',
    pinnedNotice: name => `${name}を上部にピン留めしました`,
    unpinnedNotice: name => `${name}のピン留めを解除しました`,
    hiddenNotice: name => `${name}を非表示にしました — ボットヘッダーの目のボタンで表示できます`,
    unhiddenNotice: name => `${name}を名簿に戻しました`,
    metadataLoadFailed: 'ボットのメタデータを読み込めませんでした',
    loadFailed: 'ボットを読み込めませんでした',
    groupsLoadFailed: 'ボットのグループを読み込めませんでした',
    manageGroups: 'グループを管理…',
    groupsLabel: groups => `グループ: ${groups}…`,
    duplicating: name => `${name}を複製中…`,
    duplicated: (name, source) => `${name}を作成しました — ${source}の完全なコピー`,
    attentionProviderAuth: 'このプロファイルにもう一度サインインしてください',
    attentionQuota: 'クォータまたは残高が不足しています',
    attentionMissingConfig: 'プロバイダー未設定 — hermes model を実行してください',
    attentionBlocked: 'ボットがブロックされています — 最新メッセージを確認してください',
    attentionGeneric: '要対応',
    createDescription:
      'メモリ、スキル、チャットを持つ名前付きのチームメイトです。他のエージェントにもメッセージを送れます。',
    descriptionLabel: '説明',
    createOn: '作成先',
    currentSuffix: '現在',
    titlePlaceholder: '受信トレイの振り分け',
    namePlaceholder: 'inbox-triage',
    fullConfigUnsupported: '完全な設定には新しいゲートウェイが必要です（Hermes更新後に再起動してください）。',
    remoteCapabilitiesHint:
      'リモート機能には新しいデスクトップが必要です。モデルとSOULの変更は保存するまで保留されます。',
    soulConfigLabel: 'SOUL.md（ペルソナ + エージェント間メッセージングプロトコル）',
    skillsEnabled: (enabled, total) => `スキル（${enabled}/${total}件を有効化）`,
    toolsetsEnabled: (enabled, total) => `ツールセット（${enabled}/${total}件を有効化 — すべて外すと既定に戻ります）`,
    mcpServers: 'MCPサーバー',
    remoteCreateHint: target =>
      `${target} 上にエージェントを作成します。名簿には接続ボットとして表示され、チャットはそのマシンに接続します。`,
    capabilitiesImmediate: '機能（スキル、ツール、MCPに即時適用）',
    appearanceDescription: (name, slug) => `${name}（${slug}）の外観と役割。`,
    sectionsFailed: sections => `一部のセクションに失敗しました: ${sections}`,
    updated: name => `${name}を更新しました`,
    draftDiscarded: name => `下書きエージェント「${name}」を破棄しました`,
    draftCleanupFailed: name => `下書きプロファイル「${name}」をクリーンアップできませんでした`,
    nameTaken: slug => `「${slug}」というエージェントはすでに存在します。`,
    nameTakenOn: (slug, target) => `${target} に「${slug}」というエージェントはすでに存在します。`,
    general: '一般',
    capabilities: '機能',
    skills: 'スキル',
    tools: 'ツール',
    mcp: 'MCP',
    cloneFromRemote: target => `プロファイルから複製（${target}）`,
    freshProfile: '新規プロファイル（同梱スキル）',
    inheritedModel: '起動プロファイルから継承',
    soulLabel: 'SOUL.md（任意 — 生成されたペルソナを置換）',
    shareAuth: 'メインプロファイルとキーとアカウントを共有',
    shareAuthDescription:
      'サブスクリプション、OAuthログイン、APIキーは共有され（コピーされません）、トークン更新が互いを無効にしません。オフにすると分離したスナップショットになります。',
    noSkills: '空で作成（同梱スキルをスキップ）',
    capabilitiesNameTaken: 'その名前は使用中です。機能を設定する前に別の名前を選んでください。',
    capabilitiesNameHint:
      'まずボット名を入力してください。このタブを開くと下書きプロファイルが作成され、キャンセル時に破棄されます。',
    skillsUnsupported: 'スキルには新しい Hermes Desktop が必要です。',
    catalogUnsupported: '機能カタログには新しいゲートウェイが必要です（Hermes更新後に再起動してください）。',
    emptySkills: '「空で作成」が選択されています — 同梱スキルはインストールされません。',
    catalogFrom: source => `${source} のカタログ — 未チェックのスキルは作成後に無効になります。`,
    toolsetHint: 'すべて（またはなし）をチェックすると、既定のツールセット動作になります。',
    mcpHint:
      '設定済みサーバーはメインプロファイルからコピーされます。カタログ項目は同梱MCPメニューです。APIキーが必要な項目は先にセットアップへ進みます。',
    catalogInstalled: 'カタログ・インストール済み',
    catalog: 'カタログ',
    createAction: 'ボットを作成',
    creating: '作成中…'
  },
  avatar: {
    classicShapes: 'クラシックシェイプ',
    blobFromName: 'ブロブ顔 — ボットの名前から描画',
    unlockFollowsName: 'ロック解除 — 顔がボットの名前に再び追従します',
    randomize: 'ランダム',
    auto: '自動',
    autoTitle: '自動 — 名前で決まります',
    tabBot: 'ボット',
    tabGenerate: '生成',
    upload: 'アップロード',
    tabPet: 'ペット',
    removeImage: '画像を削除してシェイプを使う',
    removeBackToShape: '削除 — シェイプアバターに戻す',
    describePlaceholder: 'アバターを説明…',
    describeHint: '空欄のままにすると、名前・タイトル・説明と agent-messaging の名簿から自動生成します。',
    matchTheName: '名前に合わせる',
    pickPet: 'このボットのプロフィール画像としてペットを選びます。',
    petLoadFailed: 'そのペットを読み込めませんでした。別のペットを試してください。',
    imageTooLarge: '画像が大きすぎます（最大 15MB）。',
    generationFailed: 'アバターの生成に失敗しました',
    savedLocally: '見た目はローカルに保存されましたが、リモートへの保存に失敗しました',
    savedLocallyDescriptionFailed: '見た目はローカルに保存されましたが、説明の更新に失敗しました',
    generate: '生成',
    generating: '生成中…',
    keepExactFace: '名前が変わってもこの顔を固定',
    lockFace: '顔を固定',
    unlockFace: '固定を解除',
    faceLocked: '顔を固定中 — 名前を変更しても変わりません。',
    faceFollowsName: '顔は名前に合わせて変わります。',
    noImageModel:
      '画像モデルがありません。有効化またはHermes更新直後の場合は、ゲートウェイを再起動してください（Ctrl+K →「ゲートウェイを再起動」）。',
    checkingImageBackend: '画像バックエンドを確認中…',
    chooseImage: '画像を選択…'
  },
  group: {
    newTitle: '新しいグループチャット',
    manageDesc: 'ボットは複数のグループチャットに参加できます。メンバーシップはすべてのマシンに同期されます。',
    manageTitle: 'グループを管理',
    settingsTitle: 'グループ設定',
    settingsDesc: 'グループ名の変更や部屋の画像の設定ができます。メンバーと履歴は保持されます。',
    nameLabel: 'グループ名',
    searchToAdd: '追加するボットを検索',
    searchToAddPlaceholder: '追加するボットを検索…',
    removeFromSelection: '選択から外す',
    disbandTitle: 'グループチャットを解散しますか？',
    deleteTitle: 'グループチャットを削除しますか？',
    deleteAction: '削除',
    composerPlaceholder: '何か書いてください — このグループのすべてのボットが部屋の内容を受け取ります。',
    attachHint: 'ファイルを添付 — 応答するすべてのボットが見ます',
    newThread: '新しいスレッド',
    reply: '返信',
    replyInThread: 'スレッドで返信',
    replyInThreadPlaceholder: 'スレッドで返信…',
    openThread: 'このスレッドを開く',
    collapseThread: 'スレッドを折りたたむ',
    collapseThreadLabel: 'このスレッドを折りたたむ',
    activity: 'アクティビティ',
    noActivityYet: 'このターンのアクティビティはまだありません。',
    showActivity: '部屋のアクティビティを表示',
    hideActivity: '部屋のアクティビティを隠す',
    stop: '停止',
    stopHint: 'この実行を停止 — ターン中のメンバーを中断し、残りを保留します',
    allHeldStatus: count => `すべてのボット（${count}体）が一時停止中`,
    heldMembersStatus: members => `一時停止中: ${members}`,
    holdReleaseHint: '一時停止中のボットにメンションするか、@all resume を送信して再開します。',
    needsYourInput: 'このグループチャットのボットが入力を待っています',
    pictureGenerationFailed: 'グループ画像の生成に失敗しました',
    nameTaken: name => `「${name}」という名前のグループはすでに存在します。`,
    memberCount: count => `ボット${count}体`,
    settingsHint: group => `グループ設定 — ${group}の名前変更やルーム画像の設定`,
    settingsLabel: group => `${group}のグループ設定`,
    disbandHint: group => `${group}グループチャットを解散`,
    disbandLabel: group => `${group}を解散`,
    disbandAction: '解散',
    disbanding: '解散中…',
    disbandDone: '解散しました',
    disbanded: group => `「${group}」を解散しました`,
    disbandDescPrefix: '',
    disbandDescSuffix: count =>
      `のグループ分けをボット${count}体から解除し、共有ルームログを消去します。ボット自体と各グループのセッションは保持されます。`,
    stopped: group => `${group}を停止しました — 残りのターンは再開するまで保留されます`,
    removeAttachment: '添付を削除',
    threadFallback: 'スレッド',
    replyCount: replies => `返信${replies}件`,
    dropToThread: 'ドロップしてこのスレッド返信に添付',
    dropToRoom: 'ドロップして添付 — 応答するすべてのボットが見られます',
    waitingForAnswer: 'あなたの回答を待っています…',
    memberThinking: name => `${name}が考えています…`,
    roomWorking: 'ルームが作業中です…',
    messageRoom: group => `${group}にメッセージ`,
    newThreadPlaceholder: group => `${group}で新しいスレッド…（@名前で個別、@everyoneで全員）`,
    everyoneMeta: 'ルーム内のすべてのボット',
    commandApproval: 'コマンドの承認',
    answerFailed: (handle, error) => `@${handle}に回答を送信できませんでした: ${error}`,
    wantsToRunCommand: handle => `@${handle}がコマンドを実行しようとしています:`,
    asks: handle => `@${handle}からの質問:`,
    answerTo: member => `@${member}に回答`,
    openGroupChat: 'グループチャットを開く',
    you: 'あなた',
    botCount: count => `ボット${count}体`,
    availability: (available, total) => `${total}体中${available}体が利用可能`,
    noBotsInChat: 'このグループチャットにボットはいません',
    back: '戻る',
    hideFullHandle: '完全なハンドルを隠す',
    showFullHandle: '完全なハンドルを表示',
    attachedFile: '添付ファイル',
    attachedImage: '添付画像',
    answerWithChoices: 'または回答を入力…',
    answerPlaceholder: '回答を入力…',
    answerOwnPlaceholder: 'または回答を入力…',
    sending: '送信中…',
    respond: '応答',
    answer: '回答',
    newDescription: max =>
      `2〜${max}体のボットを選択。ローカルの所属は各ボットプロファイルに同期され、別マシンのメンバーはこのルームに紐づきます。`,
    createAndJoin: '作成して参加',
    newGroupPlaceholder: '新しいグループ…',
    groupNameExample: 'グループ名（例: Research）',
    createdWith: (name, count) => `「${name}」を${count}体のボットで作成しました`,
    noBotsMatch: query => `「${query}」に一致するボットはありません`,
    noBotsYet: 'ボットはまだありません — 先に作成してください。',
    pickAtLeast: count => `ボットを${count}体以上選択してください`,
    activityToastsTip: 'アクティビティ通知'
  },
  tools: {
    skillsHub: 'Hermes スキルハブ',
    filterSkills: 'スキルを絞り込み…',
    searchHub: 'ハブを検索（コミュニティと既知のソース）…',
    noMcpServers: '設定済みまたはカタログ内の MCP サーバーはありません。',
    noHubMatch: 'ハブに一致するスキルはありません。',
    working: '処理中…',
    browseHub: '完全なハブを閲覧 ▾',
    hideHub: 'ハブブラウザーを隠す',
    hubHint:
      '任意のスキルで「+ Add to this Agent」を押すとインストールされ、上の一覧に表示されます。角をドラッグしてサイズを変更できます。',
    searching: 'コミュニティと既知のソースを検索中 — 約10秒かかることがあります…',
    added: '✓ 追加済み',
    installing: name => `「${name}」をインストール中…`,
    installFailed: name => `「${name}」のインストールに失敗しました`
  },
  mcp: {
    setupNeeded: requires =>
      `セットアップが必要（${requires}） — アプリ内設定を有効にするにはゲートウェイを再起動してください`,
    setupDone: 'セットアップ済み ✓',
    saveTest: '保存してテスト',
    authorizing: '認証中…',
    setupFailed: 'セットアップに失敗しました',
    retry: '再試行',
    signIn: 'サインイン…',
    setUp: 'セットアップ…',
    completeSignIn: 'ブラウザーでサインインを完了してください…',
    noTargetProfile: '対象プロファイルがありません',
    couldNotAddServer: 'サーバーを追加できませんでした',
    failedToSet: key => `${key}の設定に失敗しました`,
    configured: name => `${name}を設定しました`,
    serverTestFailed: '設定後のサーバーテストに失敗しました',
    oauthStartFailed: 'OAuthを開始できませんでした',
    oauthCallbackFailed: 'OAuthコールバックの中継に失敗しました',
    oauthFailed: 'OAuthに失敗しました',
    authenticated: name => `${name}を認証しました`
  },
  model: {
    providerLabel: 'プロバイダー',
    modelLabel: 'モデル',
    providerCustom: 'プロバイダー（カスタム）',
    modelCustom: 'モデル（カスタム）',
    providerPlaceholder: 'omnirouter / 9router / nous …',
    modelPlaceholder: 'antigravity/gemini-3.6-flash-high',
    providerCustomPlaceholder: '例: omnirouter、inferx、9router',
    modelCustomPlaceholder: '例: antigravity/gemini-3.6-flash-high',
    gatewayDefault: 'ゲートウェイの既定値',
    backToDropdowns: '← ドロップダウンに戻る',
    inheritLaunch: '継承（起動プロファイル）',
    enterManually: '✏️ 手動入力…',
    modelNamePlaceholder: '例: モデル名'
  },
  cron: {
    filterHint:
      'このプロファイルには定期実行ジョブがありますが、このボット向けのタグが付いたものはありません。ジョブ名を「[bot:<名前>] …」にするとここに表示されます。下のCronでも確認できます。',
    needsRosterFirst: 'このボットは先に名簿に表示される必要があります。',
    staleNotice: '定期実行ジョブを更新できませんでした。最後に取得したリストを表示しています。',
    readFailure: 'リストはまだ存在している可能性があります — これは読み取りの失敗で、削除ではありません。',
    createDesc: bot => `${bot}がスケジュールに沿って実行する定期タスクです。実行結果は専用のチャット履歴に残ります。`,
    instruction: '指示',
    whenToRun: '実行するタイミング',
    dayOfMonth: '日付',
    sendResultsTo: '結果の送信先',
    runHistoryOnly: '実行履歴のみ',
    botChatTarget: bot => `${bot}のチャット（ボットが応答）`,
    continuity: '継続: 各実行が前回の出力を参照します（重複を避け、続きから実行）',
    onceIn: when => `1回のみ（${when}）`,
    everyNDays: days => `${days}日ごと`,
    everyNHours: hours => `${hours}時間ごと`,
    everyNMinutes: minutes => `${minutes}分ごと`,
    freqOnce: '1回のみ、…後',
    freqHourly: '毎時',
    freqDaily: '毎日',
    freqWeekdays: '平日',
    freqWeekly: '毎週',
    freqMonthly: '毎月',
    freqInterval: '間隔',
    freqAdvanced: '詳細…',
    unitMinutes: '分',
    unitHours: '時間',
    unitDays: '日',
    runsOnce: (count, unit) => `今から${count}${unit}後に1回実行します`,
    runsHourly: '毎時0分に実行します',
    runsDaily: time => `毎日${time}に実行します`,
    runsWeekdays: time => `月曜〜金曜の${time}に実行します`,
    runsWeekly: (day, time) => `毎週${day}の${time}に実行します`,
    runsMonthly: (day, time) => `毎月${day}日の${time}に実行します`,
    runsInterval: (count, unit) => `${count}${unit}ごとに実行します`,
    runsRaw: '生のスケジュール — Nm/Nh/Nd または5フィールドのcron',
    timesTotal: count => `、合計${count}回`,
    jobDescription: 'このジョブの内容と次回の実行日時。',
    stopAfter: '停止する回数',
    runsForever: '回（空欄 = 無期限）',
    detailStatus: '状態',
    detailSchedule: 'スケジュール',
    detailScheduleRaw: 'スケジュール（raw）',
    detailRepeat: '繰り返し',
    detailNextRun: '次回実行',
    detailLastRun: '前回実行',
    detailLastResult: '前回の結果',
    detailDeliversTo: '配信先',
    detailModel: 'モデル',
    detailWorkingDirectory: '作業ディレクトリ',
    pausedSecurity: '安全のため停止中です。この古いジョブを削除して作り直してから実行してください。',
    onceMinutes: '分後',
    onceHours: '時間後',
    onceDays: '日後'
  }
}

const zh: BotsMessages = {
  roster: {
    title: '机器人',
    search: '搜索机器人和群聊',
    searchPlaceholder: '搜索机器人和群聊…',
    newBotOrGroup: '新建机器人或群聊',
    groupChats: '群聊',
    emptyTitle: '还没有机器人',
    emptyDesc: '创建你的第一个机器人。',
    noMatchQuery: query => `没有机器人或群聊匹配“${query}”`,
    noMatchQueryOn: (query, gateway) => `${gateway} 上没有机器人或群聊匹配“${query}”`,
    noMatchFiltersOn: gateway => `${gateway} 上没有机器人或群聊匹配这些筛选条件`,
    noMatchFilters: '没有机器人或群聊匹配这些筛选条件。',
    clearFilters: '清除筛选',
    newMenu: '新建…',
    activityToastsOn: '活动通知已开启 — 点击静音',
    activityToastsOff: '活动通知已关闭 — 点击开启',
    filterRoster: '筛选名单',
    filterRosterActive: count => `筛选名单（${count} 项已启用）`,
    globalGroupChats: count => `${count} 个全局群聊`,
    currentGateway: '当前网关',
    staleRefresh: '名单刷新失败 — 显示上次成功获取的列表。',
    staleWaiting: '等待网关重新连接…',
    gatewayError: '网关错误',
    deleteDescription: (name, path) => `将永久删除机器人 ${name} 及其 Hermes 配置档案（${path}）。此操作无法撤销。`,
    deletedProfile: name => `已删除配置档案 ${name}`,
    deletedGroup: name => `已删除群组“${name}”`,
    deleting: '删除中…',
    deleted: '已删除',
    allGateways: '所有网关',
    hidden: '已隐藏',
    allHidden: '所有机器人都已隐藏',
    allHiddenDesc: '它们会继续运行，并保留各自的历史。',
    showHidden: '显示已隐藏的机器人',
    noHiddenMatch: '没有已隐藏的机器人匹配这些筛选条件。',
    hiddenFromRoster: '已从名单中隐藏',
    pinned: '已置顶',
    needsAttention: '需要处理',
    needsInput: '需要你输入',
    botsAndGroups: '机器人和群聊',
    botsOnly: '仅机器人',
    groupsOnly: '仅群聊',
    anyActivity: '任何活动',
    activeNow: '正在活动',
    recentlyActive: '最近活跃',
    older: '更早',
    gatewayRemoved: '网关已移除',
    onDemand: '按需',
    ready: '就绪',
    statusUnknown: '状态未知',
    unavailable: '不可用',
    retryNow: '立即重试',
    rosterUnavailable: reason => `无法获取名单：${reason}。如果网关早于 profiles.list，请更新 Hermes 并重启网关。`,
    waitingForGateway: '正在等待网关连接…（远程网关可能需要几秒；会自动重试）'
  },
  bot: {
    newTitle: '新建机器人',
    editTitle: '编辑配置档案',
    editMenu: '编辑…',
    helpPromptPlaceholder: '这个机器人应该帮你做什么？',
    descriptionHint: '留空则根据机器人的名称和描述生成。',
    newChatWith: '与此机器人开新聊天',
    openBotChat: '打开机器人聊天',
    duplicate: '复制',
    duplicateFailed: '复制失败',
    deleteTitle: '删除机器人和配置档案？',
    removeFromAllGroups: '从所有群组中移除',
    createFirstHint: '打开机器人面板，点击“新建机器人”。',
    createFailed: '暂时无法创建配置档案',
    advanced: '高级',
    advancedHint: '高级 — 模型、技能、工具集、SOUL.md',
    advancedFailed: '高级配置失败',
    openAnotherChatUnsupported: '请更新 Hermes Desktop 以打开另一个机器人聊天。',
    remoteConnectionsUnsupported: '请更新 Hermes Desktop 以与其他连接上的机器人聊天。',
    chatEmpty: '说点什么开始吧。',
    kickoff: '你好，介绍一下你自己吧！',
    pinToTop: '置顶',
    unpin: '取消置顶',
    hide: '隐藏',
    unhide: '取消隐藏',
    pinnedNotice: name => `已将 ${name} 置顶`,
    unpinnedNotice: name => `已取消 ${name} 的置顶`,
    hiddenNotice: name => `已隐藏 ${name} — 点击机器人标题栏中的眼睛按钮可查看隐藏项`,
    unhiddenNotice: name => `已将 ${name} 恢复到名单`,
    metadataLoadFailed: '无法加载机器人元数据',
    loadFailed: '无法加载机器人',
    groupsLoadFailed: '无法加载机器人群组',
    manageGroups: '管理群组…',
    groupsLabel: groups => `群组：${groups}…`,
    duplicating: name => `正在复制 ${name}…`,
    duplicated: (name, source) => `已创建 ${name} — ${source} 的完整副本`,
    attentionProviderAuth: '请重新登录此配置档案',
    attentionQuota: '配额或余额已用尽',
    attentionMissingConfig: '提供方未配置 — 请运行 hermes model',
    attentionBlocked: '机器人已被阻止 — 查看它的最后一条消息',
    attentionGeneric: '需要处理',
    createDescription: '一个拥有独立记忆、技能和聊天的命名队友，也可以向其他智能体发送消息。',
    descriptionLabel: '描述',
    createOn: '创建位置',
    currentSuffix: '当前',
    titlePlaceholder: '收件箱分流',
    namePlaceholder: '收件箱分流',
    fullConfigUnsupported: '完整配置需要更新版本的网关（更新 Hermes 后请重启网关）。',
    remoteCapabilitiesHint: '远程能力需要更新版本的桌面端；模型和 SOUL 的修改会在保存前暂存。',
    soulConfigLabel: 'SOUL.md（人格 + 智能体消息协议）',
    skillsEnabled: (enabled, total) => `技能（已启用 ${enabled}/${total}）`,
    toolsetsEnabled: (enabled, total) => `工具集（已启用 ${enabled}/${total} — 全部取消会恢复默认）`,
    mcpServers: 'MCP 服务器',
    remoteCreateHint: target => `机器人将在 ${target} 上创建，并以连接机器人显示在名单中；聊天会路由到那台机器。`,
    capabilitiesImmediate: '能力（技能、工具和 MCP 会立即应用）',
    appearanceDescription: (name, slug) => `${name}（${slug}）的外观和角色。`,
    sectionsFailed: sections => `部分区域失败：${sections}`,
    updated: name => `已更新 ${name}`,
    draftDiscarded: name => `已放弃草稿机器人“${name}”`,
    draftCleanupFailed: name => `无法清理草稿配置档案“${name}”`,
    nameTaken: slug => `名为“${slug}”的智能体已存在。`,
    nameTakenOn: (slug, target) => `${target} 上已存在名为“${slug}”的智能体。`,
    general: '常规',
    capabilities: '能力',
    skills: '技能',
    tools: '工具',
    mcp: 'MCP',
    cloneFromRemote: target => `从配置档案克隆（位于 ${target}）`,
    freshProfile: '全新配置档案（包含内置技能）',
    inheritedModel: '继承启动配置档案',
    soulLabel: 'SOUL.md（可选 — 替换自动生成的人格）',
    shareAuth: '与主配置档案共享密钥和账户',
    shareAuthDescription:
      '订阅、OAuth 登录和 API 密钥保持共享（不会复制），因此令牌刷新不会互相失效。取消勾选可创建隔离的快照副本。',
    noSkills: '创建空配置（跳过内置技能）',
    capabilitiesNameTaken: '该名称已被占用 — 请先换一个名称再配置能力。',
    capabilitiesNameHint: '请先填写机器人名称 — 打开此标签页时会创建草稿配置档案（取消时会放弃）。',
    skillsUnsupported: '技能需要更新版本的 Hermes Desktop。',
    catalogUnsupported: '能力目录需要更新版本的网关（更新 Hermes 后请重启网关）。',
    emptySkills: '已勾选“创建空配置” — 不会安装内置技能。',
    catalogFrom: source => `目录来源：${source} — 创建后未勾选的技能会被禁用。`,
    toolsetHint: '全部（或全部不选）会保留默认工具集行为。',
    mcpHint:
      '已配置的服务器会从主配置档案复制；目录条目是内置 MCP 菜单。需要 API 密钥的条目会先进入设置流程（凭据遵循共享密钥设置）。',
    catalogInstalled: '目录 · 已安装',
    catalog: '目录',
    createAction: '创建机器人',
    creating: '创建中…'
  },
  avatar: {
    classicShapes: '经典形状',
    blobFromName: '斑点脸 — 根据机器人名称绘制',
    unlockFollowsName: '解锁 — 面孔再次跟随机器人名称',
    randomize: '随机',
    auto: '自动',
    autoTitle: '自动 — 由名称决定',
    tabBot: '机器人',
    tabGenerate: '生成',
    upload: '上传',
    tabPet: '宠物',
    removeImage: '移除图片，改用形状',
    removeBackToShape: '移除 — 回到形状头像',
    describePlaceholder: '描述你的头像…',
    describeHint: '留空则根据名称/标题/描述和 agent-messaging 名册自动生成。',
    matchTheName: '匹配名称',
    pickPet: '选择一只宠物作为此机器人的头像。',
    petLoadFailed: '无法加载该宠物 — 请换一只试试。',
    imageTooLarge: '图片过大（最大 15MB）。',
    generationFailed: '头像生成失败',
    savedLocally: '外观已保存在本地；远程持久化失败',
    savedLocallyDescriptionFailed: '外观已保存在本地；描述更新失败',
    generate: '生成',
    generating: '生成中…',
    keepExactFace: '即使名称改变也保持此头像',
    lockFace: '锁定头像',
    unlockFace: '解锁',
    faceLocked: '头像已锁定 — 重命名不会改变它。',
    faceFollowsName: '头像会跟随名称变化。',
    noImageModel: '没有可用的图像模型。如果你刚启用模型或更新了 Hermes，请重启网关：Ctrl+K →“重启网关”。',
    checkingImageBackend: '正在检查图像后端…',
    chooseImage: '选择图片…'
  },
  group: {
    newTitle: '新建群聊',
    manageDesc: '一个机器人可以加入多个群聊。成员关系会同步到每台设备。',
    manageTitle: '管理群组',
    settingsTitle: '群组设置',
    settingsDesc: '重命名群组或设置房间图片。成员和历史都会保留。',
    nameLabel: '群组名称',
    searchToAdd: '搜索要添加的机器人',
    searchToAddPlaceholder: '搜索要添加的机器人…',
    removeFromSelection: '从选择中移除',
    disbandTitle: '解散群聊？',
    deleteTitle: '删除群聊？',
    deleteAction: '删除',
    composerPlaceholder: '说点什么 — 这个群里的每个机器人都会听到。',
    attachHint: '附加文件 — 每个回应的机器人都能看到',
    newThread: '新帖子',
    reply: '回复',
    replyInThread: '在帖子中回复',
    replyInThreadPlaceholder: '在帖子中回复…',
    openThread: '打开此帖子',
    collapseThread: '收起帖子',
    collapseThreadLabel: '收起此帖子',
    activity: '活动',
    noActivityYet: '本回合还没有活动。',
    showActivity: '显示房间活动',
    hideActivity: '隐藏房间活动',
    stop: '停止',
    stopHint: '停止本次运行 — 中断当前回合的成员，并暂停其余成员',
    allHeldStatus: count => `全部 ${count} 个机器人已暂停`,
    heldMembersStatus: members => `已暂停：${members}`,
    holdReleaseHint: '提及已暂停的机器人，或发送 @all resume 以恢复它们。',
    needsYourInput: '此群聊中有机器人需要你输入',
    pictureGenerationFailed: '群组图片生成失败',
    nameTaken: name => `已存在名为“${name}”的群聊。`,
    memberCount: count => `${count} 个机器人`,
    settingsHint: group => `群聊设置 — 重命名 ${group} 或设置房间图片`,
    settingsLabel: group => `${group} 的群聊设置`,
    disbandHint: group => `解散 ${group} 群聊`,
    disbandLabel: group => `解散 ${group}`,
    disbandAction: '解散',
    disbanding: '正在解散…',
    disbandDone: '已解散',
    disbanded: group => `已解散“${group}”`,
    disbandDescPrefix: '',
    disbandDescSuffix: count =>
      ` 的分组将从 ${count} 个机器人中移除，并清空共享房间日志。机器人本身及其各群聊会话都会保留。`,
    stopped: group => `已停止 ${group} — 其余轮次将保留到你恢复为止`,
    removeAttachment: '移除附件',
    threadFallback: '讨论串',
    replyCount: replies => `${replies} 条回复`,
    dropToThread: '拖放以附加到此讨论串回复',
    dropToRoom: '拖放以附加 — 每个回应的机器人都能看到',
    waitingForAnswer: '等待你的回答…',
    memberThinking: name => `${name} 正在思考…`,
    roomWorking: '房间正在处理…',
    messageRoom: group => `发消息给 ${group}`,
    newThreadPlaceholder: group => `在 ${group} 中开启新讨论串…（@名称指定，@everyone 全体）`,
    everyoneMeta: '房间里的所有机器人',
    commandApproval: '命令批准',
    answerFailed: (handle, error) => `无法将回答发送给 @${handle}：${error}`,
    wantsToRunCommand: handle => `@${handle} 想执行一个命令：`,
    asks: handle => `@${handle} 的提问：`,
    answerTo: member => `回答 @${member}`,
    openGroupChat: '打开群聊',
    you: '你',
    botCount: count => `${count} 个机器人`,
    availability: (available, total) => `${total} 个中 ${available} 个可用`,
    noBotsInChat: '此群聊中没有机器人',
    back: '返回',
    hideFullHandle: '隐藏完整句柄',
    showFullHandle: '显示完整句柄',
    attachedFile: '附件',
    attachedImage: '图片附件',
    answerWithChoices: '或输入自定义回答…',
    answerPlaceholder: '输入回答…',
    answerOwnPlaceholder: '或输入自定义回答…',
    sending: '发送中…',
    respond: '响应',
    answer: '回答',
    newDescription: max =>
      `请选择 2–${max} 个机器人。本地成员关系会同步到各自的机器人配置档案；跨机器成员会限定在此房间内。`,
    createAndJoin: '创建并加入',
    newGroupPlaceholder: '新建群组…',
    groupNameExample: '群组名称（例如：Research）',
    createdWith: (name, count) => `已创建“${name}”，包含 ${count} 个机器人`,
    noBotsMatch: query => `没有机器人匹配“${query}”`,
    noBotsYet: '还没有机器人 — 请先创建一个。',
    pickAtLeast: count => `至少选择 ${count} 个机器人`,
    activityToastsTip: '活动通知'
  },
  tools: {
    skillsHub: 'Hermes 技能中心',
    filterSkills: '筛选技能…',
    searchHub: '搜索技能中心（社区和常见来源）…',
    noMcpServers: '未配置 MCP 服务器，目录中也没有。',
    noHubMatch: '没有匹配的技能。',
    working: '处理中…',
    browseHub: '浏览完整技能中心 ▾',
    hideHub: '隐藏技能中心浏览器',
    hubHint: '点击任意技能上的“+ Add to this Agent”即可安装，安装后会出现在上方列表中。拖动角落可调整大小。',
    searching: '正在搜索社区和常见来源 — 可能需要约 10 秒…',
    added: '✓ 已添加',
    installing: name => `正在安装“${name}”…`,
    installFailed: name => `安装“${name}”失败`
  },
  mcp: {
    setupNeeded: requires => `需要设置（${requires}） — 请重启网关以启用应用内设置`,
    setupDone: '已设置 ✓',
    saveTest: '保存并测试',
    authorizing: '授权中…',
    setupFailed: '设置失败',
    retry: '重试',
    signIn: '登录…',
    setUp: '设置…',
    completeSignIn: '请在浏览器中完成登录…',
    noTargetProfile: '没有目标配置档案',
    couldNotAddServer: '无法添加服务器',
    failedToSet: key => `无法设置 ${key}`,
    configured: name => `已配置 ${name}`,
    serverTestFailed: '设置后服务器测试失败',
    oauthStartFailed: '无法启动 OAuth',
    oauthCallbackFailed: 'OAuth 回调转发失败',
    oauthFailed: 'OAuth 失败',
    authenticated: name => `${name} 已完成身份验证`
  },
  model: {
    providerLabel: '提供方',
    modelLabel: '模型',
    providerCustom: '提供方（自定义）',
    modelCustom: '模型（自定义）',
    providerPlaceholder: 'omnirouter / 9router / nous …',
    modelPlaceholder: 'antigravity/gemini-3.6-flash-high',
    providerCustomPlaceholder: '例如：omnirouter、inferx、9router',
    modelCustomPlaceholder: '例如：antigravity/gemini-3.6-flash-high',
    gatewayDefault: '网关默认值',
    backToDropdowns: '← 返回下拉选项',
    inheritLaunch: '继承（启动配置档案）',
    enterManually: '✏️ 手动输入…',
    modelNamePlaceholder: '例如：模型名称'
  },
  cron: {
    filterHint:
      '此配置档案中有定时任务，但没有一个标记给这个机器人。将任务命名为“[bot:<名称>] …”即可显示在这里，也可以在下方的 Cron 中查看。',
    needsRosterFirst: '这个机器人需要先出现在名册中。',
    staleNotice: '无法刷新定时任务。显示的是上一次获取的列表。',
    readFailure: '列表可能仍然存在 — 这是一次读取失败，不是删除。',
    createDesc: bot => `由 ${bot} 按计划运行的重复任务。运行结果会保存在它自己的聊天记录中。`,
    instruction: '指令',
    whenToRun: '运行时间',
    dayOfMonth: '每月日期',
    sendResultsTo: '结果发送到',
    runHistoryOnly: '仅运行历史',
    botChatTarget: bot => `${bot} 的聊天（机器人会回应）`,
    continuity: '连续性：每次运行都能看到上次的输出（去重，从上次的地方继续）',
    onceIn: when => `一次（${when}）`,
    everyNDays: days => `每 ${days} 天`,
    everyNHours: hours => `每 ${hours} 小时`,
    everyNMinutes: minutes => `每 ${minutes} 分钟`,
    freqOnce: '一次，在…之后',
    freqHourly: '每小时',
    freqDaily: '每天',
    freqWeekdays: '工作日',
    freqWeekly: '每周',
    freqMonthly: '每月',
    freqInterval: '间隔',
    freqAdvanced: '高级…',
    unitMinutes: '分钟',
    unitHours: '小时',
    unitDays: '天',
    runsOnce: (count, unit) => `从现在起 ${count} ${unit}后运行一次`,
    runsHourly: '每小时整点运行',
    runsDaily: time => `每天 ${time} 运行`,
    runsWeekdays: time => `周一至周五 ${time} 运行`,
    runsWeekly: (day, time) => `每${day} ${time} 运行`,
    runsMonthly: (day, time) => `每月 ${day} 日 ${time} 运行`,
    runsInterval: (count, unit) => `每 ${count} ${unit}运行`,
    runsRaw: '原始计划 — every Nm/Nh/Nd 或 5 段 cron',
    timesTotal: count => `，共 ${count} 次`,
    jobDescription: '此任务运行的内容，以及下次运行时间。',
    stopAfter: '停止于',
    runsForever: '次（留空 = 永久）',
    detailStatus: '状态',
    detailSchedule: '计划',
    detailScheduleRaw: '计划（原始）',
    detailRepeat: '重复',
    detailNextRun: '下次运行',
    detailLastRun: '上次运行',
    detailLastResult: '上次结果',
    detailDeliversTo: '发送到',
    detailModel: '模型',
    detailWorkingDirectory: '工作目录',
    pausedSecurity: '出于安全原因已暂停：请删除并重新创建此旧任务后再运行。',
    onceMinutes: '分钟后',
    onceHours: '小时后',
    onceDays: '天后'
  }
}

const zhHant: BotsMessages = {
  roster: {
    title: '機器人',
    search: '搜尋機器人和群組聊天',
    searchPlaceholder: '搜尋機器人和群組聊天…',
    newBotOrGroup: '新增機器人或群組聊天',
    groupChats: '群組聊天',
    emptyTitle: '還沒有機器人',
    emptyDesc: '建立你的第一個機器人。',
    noMatchQuery: query => `沒有機器人或群組聊天符合「${query}」`,
    noMatchQueryOn: (query, gateway) => `${gateway} 上沒有機器人或群組聊天符合「${query}」`,
    noMatchFiltersOn: gateway => `${gateway} 上沒有機器人或群組聊天符合這些篩選條件`,
    noMatchFilters: '沒有機器人或群組聊天符合這些篩選條件。',
    clearFilters: '清除篩選',
    newMenu: '新增…',
    activityToastsOn: '活動通知已開啟 — 點擊靜音',
    activityToastsOff: '活動通知已關閉 — 點擊開啟',
    filterRoster: '篩選名單',
    filterRosterActive: count => `篩選名單（${count} 項已啟用）`,
    globalGroupChats: count => `${count} 個全域群組聊天`,
    currentGateway: '目前閘道',
    staleRefresh: '名單重新整理失敗 — 顯示上次成功取得的清單。',
    staleWaiting: '正在等待閘道重新連線…',
    gatewayError: '閘道錯誤',
    deleteDescription: (name, path) => `將永久刪除機器人 ${name} 及其 Hermes 設定檔（${path}）。此操作無法復原。`,
    deletedProfile: name => `已刪除設定檔 ${name}`,
    deletedGroup: name => `已刪除群組「${name}」`,
    deleting: '刪除中…',
    deleted: '已刪除',
    allGateways: '所有閘道',
    hidden: '隱藏',
    allHidden: '所有機器人都已隱藏',
    allHiddenDesc: '它們會繼續運作，並保留各自的歷史。',
    showHidden: '顯示已隱藏的機器人',
    noHiddenMatch: '沒有已隱藏的機器人符合這些篩選條件。',
    hiddenFromRoster: '已從名單中隱藏',
    pinned: '已釘選',
    needsAttention: '需要處理',
    needsInput: '需要您的輸入',
    botsAndGroups: '機器人和群組聊天',
    botsOnly: '僅機器人',
    groupsOnly: '僅群組聊天',
    anyActivity: '任何活動',
    activeNow: '目前活躍',
    recentlyActive: '最近活躍',
    older: '更早',
    gatewayRemoved: '閘道已移除',
    onDemand: '隨需',
    ready: '就緒',
    statusUnknown: '狀態未知',
    unavailable: '不可用',
    retryNow: '立即重試',
    rosterUnavailable: reason => `無法取得名單：${reason}。如果閘道早於 profiles.list，請更新 Hermes 並重新啟動閘道。`,
    waitingForGateway: '正在等待閘道連線…（遠端閘道可能需要幾秒；會自動重試）'
  },
  bot: {
    newTitle: '新增機器人',
    editTitle: '編輯設定檔',
    editMenu: '編輯…',
    helpPromptPlaceholder: '這個機器人應該幫你做什麼？',
    descriptionHint: '留空則依機器人的名稱和描述產生。',
    newChatWith: '與此機器人開新聊天',
    openBotChat: '開啟機器人聊天',
    duplicate: '複製',
    duplicateFailed: '複製失敗',
    deleteTitle: '刪除機器人和設定檔？',
    removeFromAllGroups: '從所有群組中移除',
    createFirstHint: '開啟機器人面板，點「新增機器人」。',
    createFailed: '暫時無法建立設定檔',
    advanced: '進階',
    advancedHint: '進階 — 模型、技能、工具集、SOUL.md',
    advancedFailed: '進階設定失敗',
    openAnotherChatUnsupported: '請更新 Hermes Desktop 以開啟另一個機器人聊天。',
    remoteConnectionsUnsupported: '請更新 Hermes Desktop 以與其他連線上的機器人聊天。',
    chatEmpty: '說點什麼開始吧。',
    kickoff: '你好，介紹一下你自己吧！',
    pinToTop: '釘選到頂端',
    unpin: '取消釘選',
    hide: '隱藏',
    unhide: '取消隱藏',
    pinnedNotice: name => `已將 ${name} 釘選到頂端`,
    unpinnedNotice: name => `已取消 ${name} 的釘選`,
    hiddenNotice: name => `已隱藏 ${name} — 點擊機器人標題列的眼睛按鈕即可查看`,
    unhiddenNotice: name => `已將 ${name} 放回名單`,
    metadataLoadFailed: '無法載入機器人中繼資料',
    loadFailed: '無法載入機器人',
    groupsLoadFailed: '無法載入機器人群組',
    manageGroups: '管理群組…',
    groupsLabel: groups => `群組：${groups}…`,
    duplicating: name => `正在複製 ${name}…`,
    duplicated: (name, source) => `已建立 ${name} — ${source} 的完整副本`,
    attentionProviderAuth: '請重新登入此設定檔',
    attentionQuota: '配額或餘額已用盡',
    attentionMissingConfig: '提供者尚未設定 — 請執行 hermes model',
    attentionBlocked: '機器人已遭封鎖 — 查看它的最後一則訊息',
    attentionGeneric: '需要處理',
    createDescription: '一個擁有獨立記憶、技能和聊天的命名隊友，也可以向其他智慧體傳送訊息。',
    descriptionLabel: '描述',
    createOn: '建立位置',
    currentSuffix: '目前',
    titlePlaceholder: '收件匣分流',
    namePlaceholder: '收件匣分流',
    fullConfigUnsupported: '完整設定需要較新版本的閘道（更新 Hermes 後請重新啟動閘道）。',
    remoteCapabilitiesHint: '遠端能力需要較新版本的桌面版；模型和 SOUL 的變更會在儲存前暫存。',
    soulConfigLabel: 'SOUL.md（人格 + 智慧體訊息協定）',
    skillsEnabled: (enabled, total) => `技能（已啟用 ${enabled}/${total}）`,
    toolsetsEnabled: (enabled, total) => `工具集（已啟用 ${enabled}/${total} — 全部取消會恢復預設）`,
    mcpServers: 'MCP 伺服器',
    remoteCreateHint: target => `機器人將在 ${target} 上建立，並以連線機器人顯示在名單中；聊天會路由到那台機器。`,
    capabilitiesImmediate: '能力（技能、工具和 MCP 會立即套用）',
    appearanceDescription: (name, slug) => `${name}（${slug}）的外觀和角色。`,
    sectionsFailed: sections => `部分區域失敗：${sections}`,
    updated: name => `已更新 ${name}`,
    draftDiscarded: name => `已放棄草稿機器人「${name}」`,
    draftCleanupFailed: name => `無法清理草稿設定檔「${name}」`,
    nameTaken: slug => `名為「${slug}」的智慧體已存在。`,
    nameTakenOn: (slug, target) => `${target} 上已存在名為「${slug}」的智慧體。`,
    general: '一般',
    capabilities: '能力',
    skills: '技能',
    tools: '工具',
    mcp: 'MCP',
    cloneFromRemote: target => `從設定檔複製（位於 ${target}）`,
    freshProfile: '全新設定檔（包含內建技能）',
    inheritedModel: '繼承啟動設定檔',
    soulLabel: 'SOUL.md（選用 — 取代自動產生的人格）',
    shareAuth: '與主要設定檔共用金鑰和帳戶',
    shareAuthDescription:
      '訂閱、OAuth 登入和 API 金鑰保持共用（不會複製），因此權杖更新不會互相失效。取消勾選可建立隔離的快照副本。',
    noSkills: '建立空設定（略過內建技能）',
    capabilitiesNameTaken: '該名稱已被使用 — 請先換一個名稱再設定能力。',
    capabilitiesNameHint: '請先填寫機器人名稱 — 開啟此分頁時會建立草稿設定檔（取消時會放棄）。',
    skillsUnsupported: '技能需要較新版本的 Hermes Desktop。',
    catalogUnsupported: '能力目錄需要較新版本的閘道（更新 Hermes 後請重新啟動閘道）。',
    emptySkills: '已勾選「建立空設定」 — 不會安裝內建技能。',
    catalogFrom: source => `目錄來源：${source} — 建立後未勾選的技能會被停用。`,
    toolsetHint: '全部（或全部不選）會保留預設工具集行為。',
    mcpHint:
      '已設定的伺服器會從主要設定檔複製；目錄項目是內建 MCP 選單。需要 API 金鑰的項目會先進入設定流程（憑證遵循共用金鑰設定）。',
    catalogInstalled: '目錄 · 已安裝',
    catalog: '目錄',
    createAction: '建立機器人',
    creating: '建立中…'
  },
  avatar: {
    classicShapes: '經典形狀',
    blobFromName: '斑點臉 — 依機器人名稱繪製',
    unlockFollowsName: '解鎖 — 面孔再次跟隨機器人名稱',
    randomize: '隨機',
    auto: '自動',
    autoTitle: '自動 — 由名稱決定',
    tabBot: '機器人',
    tabGenerate: '生成',
    upload: '上傳',
    tabPet: '寵物',
    removeImage: '移除圖片，改用形狀',
    removeBackToShape: '移除 — 回到形狀頭像',
    describePlaceholder: '描述你的頭像…',
    describeHint: '留空則依名稱／標題／描述與 agent-messaging 名冊自動產生。',
    matchTheName: '符合名稱',
    pickPet: '選擇一隻寵物作為此機器人的頭像。',
    petLoadFailed: '無法載入該寵物 — 請換一隻試試。',
    imageTooLarge: '圖片過大（最大 15MB）。',
    generationFailed: '頭像產生失敗',
    savedLocally: '外觀已儲存在本機；遠端持久化失敗',
    savedLocallyDescriptionFailed: '外觀已儲存在本機；描述更新失敗',
    generate: '生成',
    generating: '生成中…',
    keepExactFace: '即使名稱變更也保持此頭像',
    lockFace: '鎖定頭像',
    unlockFace: '解除鎖定',
    faceLocked: '頭像已鎖定 — 重新命名不會改變它。',
    faceFollowsName: '頭像會跟隨名稱變化。',
    noImageModel: '沒有可用的圖片模型。如果你剛啟用模型或更新 Hermes，請重新啟動閘道：Ctrl+K →「重新啟動閘道」。',
    checkingImageBackend: '正在檢查圖片後端…',
    chooseImage: '選擇圖片…'
  },
  group: {
    newTitle: '新增群組聊天',
    manageDesc: '一個機器人可以加入多個群組聊天。成員關係會同步到每台裝置。',
    manageTitle: '管理群組',
    settingsTitle: '群組設定',
    settingsDesc: '重新命名群組或設定房間圖片。成員和歷史都會保留。',
    nameLabel: '群組名稱',
    searchToAdd: '搜尋要加入的機器人',
    searchToAddPlaceholder: '搜尋要加入的機器人…',
    removeFromSelection: '從選取中移除',
    disbandTitle: '解散群組聊天？',
    deleteTitle: '刪除群組聊天？',
    deleteAction: '刪除',
    composerPlaceholder: '說點什麼 — 這個群組裡的每個機器人都會聽到。',
    attachHint: '附加檔案 — 每個回應的機器人都能看到',
    newThread: '新討論串',
    reply: '回覆',
    replyInThread: '在討論串中回覆',
    replyInThreadPlaceholder: '在討論串中回覆…',
    openThread: '開啟此討論串',
    collapseThread: '收合討論串',
    collapseThreadLabel: '收合此討論串',
    activity: '活動',
    noActivityYet: '本回合還沒有活動。',
    showActivity: '顯示房間活動',
    hideActivity: '隱藏房間活動',
    stop: '停止',
    stopHint: '停止本次執行 — 中斷目前回合的成員，並暫停其餘成員',
    allHeldStatus: count => `全部 ${count} 個機器人已暫停`,
    heldMembersStatus: members => `已暫停：${members}`,
    holdReleaseHint: '提及已暫停的機器人，或傳送 @all resume 以恢復它們。',
    needsYourInput: '此群組聊天中有機器人需要您的輸入',
    pictureGenerationFailed: '群組圖片產生失敗',
    nameTaken: name => `已存在名為「${name}」的群組聊天。`,
    memberCount: count => `${count} 個機器人`,
    settingsHint: group => `群組設定 — 重新命名 ${group} 或設定房間圖片`,
    settingsLabel: group => `${group} 的群組設定`,
    disbandHint: group => `解散 ${group} 群組聊天`,
    disbandLabel: group => `解散 ${group}`,
    disbandAction: '解散',
    disbanding: '正在解散…',
    disbandDone: '已解散',
    disbanded: group => `已解散「${group}」`,
    disbandDescPrefix: '',
    disbandDescSuffix: count =>
      ` 的分組將從 ${count} 個機器人中移除，並清空共享房間日誌。機器人本身及其各群組工作階段都會保留。`,
    stopped: group => `已停止 ${group} — 其餘回合將保留到你恢復為止`,
    removeAttachment: '移除附件',
    threadFallback: '討論串',
    replyCount: replies => `${replies} 則回覆`,
    dropToThread: '拖放以附加到此討論串回覆',
    dropToRoom: '拖放以附加 — 每個回應的機器人都能看到',
    waitingForAnswer: '等待你的回答…',
    memberThinking: name => `${name} 正在思考…`,
    roomWorking: '房間正在處理…',
    messageRoom: group => `傳訊息給 ${group}`,
    newThreadPlaceholder: group => `在 ${group} 中開啟新討論串…（@名稱指定，@everyone 全體）`,
    everyoneMeta: '房間裡的所有機器人',
    commandApproval: '命令核准',
    answerFailed: (handle, error) => `無法將回答傳送給 @${handle}：${error}`,
    wantsToRunCommand: handle => `@${handle} 想執行一個命令：`,
    asks: handle => `@${handle} 的提問：`,
    answerTo: member => `回覆 @${member}`,
    openGroupChat: '開啟群組聊天',
    you: '你',
    botCount: count => `${count} 個機器人`,
    availability: (available, total) => `${total} 個中 ${available} 個可用`,
    noBotsInChat: '此群組聊天中沒有機器人',
    back: '返回',
    hideFullHandle: '隱藏完整控制代碼',
    showFullHandle: '顯示完整控制代碼',
    attachedFile: '附件檔案',
    attachedImage: '圖片附件',
    answerWithChoices: '或輸入自訂回答…',
    answerPlaceholder: '輸入回答…',
    answerOwnPlaceholder: '或輸入自訂回答…',
    sending: '傳送中…',
    respond: '回應',
    answer: '回答',
    newDescription: max =>
      `請選擇 2–${max} 個機器人。本機成員關係會同步到各自的機器人設定檔；跨機器成員會限定在此房間內。`,
    createAndJoin: '建立並加入',
    newGroupPlaceholder: '新增群組…',
    groupNameExample: '群組名稱（例如：Research）',
    createdWith: (name, count) => `已建立「${name}」，包含 ${count} 個機器人`,
    noBotsMatch: query => `沒有機器人符合「${query}」`,
    noBotsYet: '還沒有機器人 — 請先建立一個。',
    pickAtLeast: count => `至少選擇 ${count} 個機器人`,
    activityToastsTip: '活動通知'
  },
  tools: {
    skillsHub: 'Hermes 技能中心',
    filterSkills: '篩選技能…',
    searchHub: '搜尋技能中心（社群和常見來源）…',
    noMcpServers: '未設定 MCP 伺服器，目錄中也沒有。',
    noHubMatch: '沒有符合的技能。',
    working: '處理中…',
    browseHub: '瀏覽完整技能中心 ▾',
    hideHub: '隱藏技能中心瀏覽器',
    hubHint: '點擊任意技能上的「+ Add to this Agent」即可安裝，安裝後會出現在上方清單中。拖曳角落可調整大小。',
    searching: '正在搜尋社群和常見來源 — 可能需要約 10 秒…',
    added: '✓ 已新增',
    installing: name => `正在安裝「${name}」…`,
    installFailed: name => `安裝「${name}」失敗`
  },
  mcp: {
    setupNeeded: requires => `需要設定（${requires}） — 請重新啟動閘道以啟用應用程式內設定`,
    setupDone: '已設定 ✓',
    saveTest: '儲存並測試',
    authorizing: '授權中…',
    setupFailed: '設定失敗',
    retry: '重試',
    signIn: '登入…',
    setUp: '設定…',
    completeSignIn: '請在瀏覽器中完成登入…',
    noTargetProfile: '沒有目標設定檔',
    couldNotAddServer: '無法新增伺服器',
    failedToSet: key => `無法設定 ${key}`,
    configured: name => `已設定 ${name}`,
    serverTestFailed: '設定後伺服器測試失敗',
    oauthStartFailed: '無法啟動 OAuth',
    oauthCallbackFailed: 'OAuth 回呼轉送失敗',
    oauthFailed: 'OAuth 失敗',
    authenticated: name => `${name} 已完成驗證`
  },
  model: {
    providerLabel: '提供者',
    modelLabel: '模型',
    providerCustom: '提供者（自訂）',
    modelCustom: '模型（自訂）',
    providerPlaceholder: 'omnirouter / 9router / nous …',
    modelPlaceholder: 'antigravity/gemini-3.6-flash-high',
    providerCustomPlaceholder: '例如：omnirouter、inferx、9router',
    modelCustomPlaceholder: '例如：antigravity/gemini-3.6-flash-high',
    gatewayDefault: '閘道預設值',
    backToDropdowns: '← 返回下拉選單',
    inheritLaunch: '繼承（啟動設定檔）',
    enterManually: '✏️ 手動輸入…',
    modelNamePlaceholder: '例如：模型名稱'
  },
  cron: {
    filterHint:
      '此設定檔中有排程工作，但沒有任何一個標記給這個機器人。將工作命名為「[bot:<名稱>] …」即可顯示在這裡，也可以在下方的 Cron 中查看。',
    needsRosterFirst: '這個機器人需要先出現在名冊中。',
    staleNotice: '無法重新整理排程工作。顯示的是上一次取得的清單。',
    readFailure: '清單可能仍然存在 — 這是一次讀取失敗，不是刪除。',
    createDesc: bot => `由 ${bot} 按排程執行的重複工作。執行結果會保存在它自己的聊天紀錄中。`,
    instruction: '指示',
    whenToRun: '執行時間',
    dayOfMonth: '每月日期',
    sendResultsTo: '結果傳送到',
    runHistoryOnly: '僅執行紀錄',
    botChatTarget: bot => `${bot} 的聊天（機器人會回應）`,
    continuity: '連續性：每次執行都能看到上次的輸出（去重，從上次的地方繼續）',
    onceIn: when => `一次（${when}）`,
    everyNDays: days => `每 ${days} 天`,
    everyNHours: hours => `每 ${hours} 小時`,
    everyNMinutes: minutes => `每 ${minutes} 分鐘`,
    freqOnce: '一次，在…之後',
    freqHourly: '每小時',
    freqDaily: '每天',
    freqWeekdays: '工作日',
    freqWeekly: '每週',
    freqMonthly: '每月',
    freqInterval: '間隔',
    freqAdvanced: '進階…',
    unitMinutes: '分鐘',
    unitHours: '小時',
    unitDays: '天',
    runsOnce: (count, unit) => `從現在起 ${count} ${unit}後執行一次`,
    runsHourly: '每小時整點執行',
    runsDaily: time => `每天 ${time} 執行`,
    runsWeekdays: time => `週一至週五 ${time} 執行`,
    runsWeekly: (day, time) => `每${day} ${time} 執行`,
    runsMonthly: (day, time) => `每月 ${day} 日 ${time} 執行`,
    runsInterval: (count, unit) => `每 ${count} ${unit}執行`,
    runsRaw: '原始排程 — every Nm/Nh/Nd 或 5 段 cron',
    timesTotal: count => `，共 ${count} 次`,
    jobDescription: '此工作執行的內容與下次執行時間。',
    stopAfter: '停止於',
    runsForever: '次（留白 = 永遠）',
    detailStatus: '狀態',
    detailSchedule: '排程',
    detailScheduleRaw: '排程（原始）',
    detailRepeat: '重複',
    detailNextRun: '下次執行',
    detailLastRun: '上次執行',
    detailLastResult: '上次結果',
    detailDeliversTo: '傳送到',
    detailModel: '模型',
    detailWorkingDirectory: '工作目錄',
    pausedSecurity: '基於安全考量已暫停：請刪除並重新建立此舊工作後再執行。',
    onceMinutes: '分鐘後',
    onceHours: '小時後',
    onceDays: '天後'
  }
}

/** Registered via `ctx.i18n.register` at plugin load (disposer tracked). */
export const BOTS_LOCALES: PluginLocaleBundles = { en, ja, zh, 'zh-hant': zhHant }

// Bind the message SHAPE to a plugin translator: string leaves resolve now,
// function leaves forward their args through t(path, …).
type Bound<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : T[K] extends object
      ? Bound<T[K]>
      : string
}

function bind<T extends object>(t: PluginTranslate, template: T, prefix = ''): Bound<T> {
  const out = {} as Record<string, unknown>

  for (const [key, value] of Object.entries(template)) {
    const path = prefix ? `${prefix}.${key}` : key
    out[key] =
      typeof value === 'function'
        ? (...args: unknown[]) => t(path, ...args)
        : value && typeof value === 'object'
          ? bind(t, value as object, path)
          : t(path)
  }

  return out as Bound<T>
}

export type BotsText = Bound<BotsMessages>

/** The Bot Mode strings for the active locale — one hook every component reads. */
export function useBots(): BotsText {
  const t = usePluginI18n('hermes-bots')

  return useMemo(() => bind(t, en), [t])
}

/** Resolve a dotted path against the English bundle — the floor for a read
 *  that beats `ctx.i18n` into existence, so an unresolved key never ships as
 *  the literal `cron.runsHourly`. */
function english(key: string, ...args: unknown[]): string {
  const leaf = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en)

  return typeof leaf === 'function' ? (leaf as (...a: unknown[]) => string)(...args) : String(leaf ?? key)
}

let bound: { text: BotsText; translate: PluginTranslate } | null = null

/** `useBots` for the module-level functions a hook can't reach — the schedule
 *  summarizers and label helpers that render inside components but aren't
 *  components. Non-reactive on its own; every caller is invoked during a
 *  render that a core `useI18n()` already subscribes to, so a locale switch
 *  still repaints. Cached on translator identity: `bind` walks the whole tree,
 *  and these run per row. */
export function botsText(): BotsText {
  const translate = getPluginCtx()?.i18n?.t ?? english

  if (bound?.translate !== translate) {
    bound = { text: bind(translate, en), translate }
  }

  return bound.text
}
