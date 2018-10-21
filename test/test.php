<?php

switch ($_SERVER['REQUEST_URI']) {
    case '/header':
        header('X-Custom-Header: Hello World');
        break;
    case '/post':
        echo $_POST['key1'] . ' ' . $_POST['key2'];
        break;
    case '/query':
        echo $_GET['key1'] . ' ' . $_GET['key2'];
        break;
    default:
        http_response_code(404);
        break;
}
