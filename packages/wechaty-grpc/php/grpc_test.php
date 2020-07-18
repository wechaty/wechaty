<?php
/**
 * Created by PhpStorm.
 * User: peterzhang
 * Date: 2020/7/10
 * Time: 2:11 PM
 */

define("ROOT", __DIR__);

function autoload($clazz) {
    $file = str_replace('\\', '/', $clazz);
    if(is_file(ROOT . "/generated/wechaty/$file.php")) {
        require ROOT . "/generated/wechaty/$file.php";
    } else {
        $file = str_replace('\\', '/', $clazz);
        if(is_file("/usr/share/pear/$file.php")) {
            require "/usr/share/pear/$file.php";
        }
    }
}

spl_autoload_register("autoload");

$client = new \Wechaty\PuppetClient("localhost:8788", [
  'credentials' => Grpc\ChannelCredentials::createInsecure()
]);
$request = new \Wechaty\Puppet\DingRequest();
list($response, $status) = $client->Ding($request)->wait();
echo sprintf("code: %s, msg: %s \n", $status->code, $status->details);
