exports = module.exports = async function onMessage (message) {
    const room      = message.room();
    const sender    = message.from();
    const content   = message.content();

    const topic = room ? '[' + room.topic() + ']' : '';


    console.log(`${topic} <${sender.name()}> : ${message.toStringDigest()}`);
    
    if (message.self() || room) {
        console.log('message is sent from myself, or inside a room.');
        return;
    }

    if (content === 'ding') {
         message.say('thanks for ding me...');
    } else {
        sender.say('auto reply.');
        return;
    }
}