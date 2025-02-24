using Microsoft.AspNetCore.SignalR;
using MouseFighterProto.Server.Models;

namespace MouseFighterProto.Server.Hubs
{
    public class DrawHub : Hub
    {
        public async Task SendDrawing(MousePosition lastPos, MousePosition currentPos)
        {
            await Clients.Others.SendAsync("ReceiveDrawing", lastPos, currentPos);
        }

        public async Task SendReset()
        {
            await Clients.Others.SendAsync("ReceiveReset");
        }

        public async Task SendLost()
        {
            await Clients.Others.SendAsync("ReceiveLost");
        }
    }
}
