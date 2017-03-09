exports = module.exports = async function onFriend (contact, request) {
    if(request){
        let name = contact.name();
        await request.accept();

        console.log(`Contact: ${name} send request ${request.hello}`);
    }
}
